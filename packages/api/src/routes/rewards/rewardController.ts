import type { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import prisma from '../../utils/prismaClient'
import Prisma from '@prisma/client'
import { PiDetailsQuerySchema } from '../../schema/zod/schemas/piSchema'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { doGetTvlStrategy, doGetTvl, doGetTvlBeaconChain } from '../metrics/metricController'

export type Submission = {
	rewardsSubmissionHash: string
	startTimestamp: number
	duration: number
	totalAmount: string
	tokenAddress: string
	strategies: {
		strategyAddress: string
		multiplier: string
		amount: string
	}[]
}

/**
 * Function for route /operators
 * Returns a list of all Operators with optional sorts & text search
 *
 * @param req
 * @param res
 */
export async function getStrategies(req: Request, res: Response) {
	try {
		const allSubmissions = await prisma.avsStrategyRewardSubmission.findMany()
		const strategyTokensMap = new Map<string, Set<string>>()

		for (const submission of allSubmissions) {
			const strategyAddress = submission.strategyAddress.toLowerCase()
			const tokenAddress = submission.token.toLowerCase()

			if (!strategyTokensMap.has(strategyAddress)) {
				strategyTokensMap.set(strategyAddress, new Set<string>())
			}

			strategyTokensMap.get(strategyAddress)?.add(tokenAddress)
		}

		const strategies = Array.from(strategyTokensMap.entries()).map(([strategyAddress, tokens]) => ({
			strategyAddress,
			tokens: Array.from(tokens)
		}))

		const result = {
			strategies,
			total: strategies.length
		}

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /programmatic-incentives
 * Returns APY and weekly EIGEN token amounts for PI
 *
 * @param req
 * @param res
 */
export async function getProgrammaticIncentives(req: Request, res: Response) {
	const queryCheck = PiDetailsQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { tokenAddresses, amounts } = queryCheck.data
		const tokenPrices = await fetchTokenPrices()

		const isHolesky = process.env.NETWORK === 'holesky'
		const eigenTokenAddress = isHolesky
			? '0x275ccf9be51f4a6c94aba6114cdf2a4c45b9cb27'
			: '0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83'

		const eigenTokenPrice = tokenPrices.find(
			(tp) => tp.address.toLowerCase() === eigenTokenAddress.toLowerCase()
		)

		if (!eigenTokenPrice) {
			throw new Error('EIGEN token price not found')
		}

		const eigenStrategyAddress = isHolesky
			? '0x43252609bff8a13dfe5e057097f2f45a24387a84'
			: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'

		const foundEigenStrategy = await prisma.strategies.findUnique({
			where: { address: eigenStrategyAddress.toLowerCase() }
		})

		if (!foundEigenStrategy) {
			throw new Error(`EIGEN strategy not found for address: ${eigenStrategyAddress}`)
		}

		const [tvlRestaking, tvlBeaconChain, tvlStrategyResult] = await Promise.all([
			doGetTvl(false).then((d) => d.tvlRestaking as number),
			doGetTvlBeaconChain(false),
			doGetTvlStrategy(
				foundEigenStrategy.address as `0x${string}`,
				foundEigenStrategy.underlyingToken as `0x${string}`,
				false
			).then((r) => r.tvlEth as number)
		])

		const totalTvlEigenStrategy = tvlStrategyResult
		const totalTvlEthNetwork = (tvlRestaking as number) + (tvlBeaconChain as number)
		const totalTvlEthLst = totalTvlEthNetwork - totalTvlEigenStrategy

		const WEEKLY_PI_EIGEN = new Prisma.Prisma.Decimal(321855)
		const WEEKLY_PI_ETH_LST = new Prisma.Prisma.Decimal(965565)

		const calcApy = (weeklyToken: Prisma.Prisma.Decimal, totalTvl: number) => {
			return totalTvl > 0
				? weeklyToken
						.mul(new Prisma.Prisma.Decimal('0.9')) // Stake share
						.mul(new Prisma.Prisma.Decimal(52)) // Annualize weekly reward
						.mul(new Prisma.Prisma.Decimal(100))
						.mul(new Prisma.Prisma.Decimal(eigenTokenPrice?.ethPrice ?? 0))
						.div(new Prisma.Prisma.Decimal(totalTvl))
				: new Prisma.Prisma.Decimal(0)
		}

		const eigenStrategyApy = calcApy(WEEKLY_PI_EIGEN, totalTvlEigenStrategy)
		const ethAndLstStrategiesApy = calcApy(WEEKLY_PI_ETH_LST, totalTvlEthLst)

		// If no input provided, return only APYs
		if (amounts.length === 0) {
			return res.send({
				eigenStrategyApy,
				ethAndLstStrategiesApy
			})
		}

		let eigenStakedAmount = new Prisma.Prisma.Decimal(0)
		let ethLstStakedAmount = new Prisma.Prisma.Decimal(0)

		tokenAddresses.forEach((token, i) => {
			const price = tokenPrices.find((tp) => tp.address.toLowerCase() === token.toLowerCase())
			const amount = new Prisma.Prisma.Decimal(amounts[i]).div(
				new Prisma.Prisma.Decimal(10).pow(price?.decimals ?? 18)
			)

			if (token.toLowerCase() === eigenTokenAddress.toLowerCase()) {
				eigenStakedAmount = amount.mul(new Prisma.Prisma.Decimal(price?.ethPrice ?? 0))
			} else {
				ethLstStakedAmount = ethLstStakedAmount.add(
					amount.mul(new Prisma.Prisma.Decimal(price?.ethPrice ?? 0))
				)
			}
		})

		let eigenTokenAmount = BigInt(0)
		let ethLstTokenAmount = BigInt(0)

		const rewardPortion = (
			weeklyToken: Prisma.Prisma.Decimal,
			stakedAmount: Prisma.Prisma.Decimal,
			totalTvl: number
		) => {
			return totalTvl > 0
				? weeklyToken
						.mul(new Prisma.Prisma.Decimal('0.9'))
						.mul(stakedAmount)
						.div(new Prisma.Prisma.Decimal(totalTvl))
				: new Prisma.Prisma.Decimal(0)
		}

		if (!eigenStakedAmount.isZero()) {
			const reward = rewardPortion(WEEKLY_PI_EIGEN, eigenStakedAmount, totalTvlEigenStrategy)
			const rewardScaled = reward.mul(new Prisma.Prisma.Decimal(10).pow(18))
			const rewardStr = rewardScaled.floor().toFixed(0)
			eigenTokenAmount = BigInt(rewardStr)
		}

		if (!ethLstStakedAmount.isZero()) {
			const reward = rewardPortion(WEEKLY_PI_ETH_LST, ethLstStakedAmount, totalTvlEthLst)
			const rewardScaled = reward.mul(new Prisma.Prisma.Decimal(10).pow(18))
			const rewardStr = rewardScaled.floor().toFixed(0)
			ethLstTokenAmount = BigInt(rewardStr)
		}

		const totalPiTokenAmount = eigenTokenAmount + ethLstTokenAmount

		const totalPiEth = new Prisma.Prisma.Decimal(totalPiTokenAmount.toString()).mul(
			new Prisma.Prisma.Decimal(eigenTokenPrice?.ethPrice ?? 0)
		)

		let aggregateApy = new Prisma.Prisma.Decimal(0)
		if (!eigenStakedAmount.isZero() && ethLstStakedAmount.isZero()) {
			aggregateApy = eigenStrategyApy
		} else if (eigenStakedAmount.isZero() && !ethLstStakedAmount.isZero()) {
			aggregateApy = ethAndLstStrategiesApy
		} else if (!eigenStakedAmount.isZero() && !ethLstStakedAmount.isZero()) {
			aggregateApy = eigenStakedAmount.add(ethLstStakedAmount).gt(new Prisma.Prisma.Decimal(0))
				? totalPiEth
						.mul(52)
						.div(eigenStakedAmount.add(ethLstStakedAmount))
						.mul(100)
						.div(new Prisma.Prisma.Decimal(10).pow(18))
				: new Prisma.Prisma.Decimal(0)
		}

		res.send({
			eigenStrategyApy,
			ethAndLstStrategiesApy,
			aggregateApy,
			totalWeeklyRewardsEigen: totalPiTokenAmount.toString(),
			weeklyRewardsEigen: {
				eigenStrategy: eigenTokenAmount.toString(),
				ethAndLstStrategies: ethLstTokenAmount.toString()
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
