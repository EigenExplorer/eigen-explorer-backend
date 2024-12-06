import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import Prisma from '@prisma/client'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { getViemClient } from '../../viem/viemClient'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL,
	sharesToTVLStrategies
} from '../../utils/strategyShares'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { withOperatorShares } from '../../utils/operatorShares'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { UpdatedSinceQuerySchema } from '../../schema/zod/schemas/updatedSinceQuery'
import { WithRewardsQuerySchema } from '../../schema/zod/schemas/withRewardsQuery'
import { ActiveQuerySchema } from '../../schema/zod/schemas/activeQuery'

/**
 * Route to get a list of all stakers
 *
 * @param req
 * @param res
 */
export async function getAllStakers(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(UpdatedSinceQuerySchema)
		.and(ActiveQuerySchema)
		.safeParse(req.query)

	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take, withTvl, updatedSince, active } = result.data

	try {
		// Fetch count and record
		const stakersCount = await prisma.staker.count({
			where: {
				...(updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}),
				...(active
					? {
							shares: {
								some: {
									shares: {
										not: '0'
									}
								}
							}
					  }
					: {})
			}
		})

		const stakersRecords = await prisma.staker.findMany({
			skip,
			take,
			where: {
				...(updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}),
				...(active
					? {
							shares: {
								some: {
									shares: {
										not: '0'
									}
								}
							}
					  }
					: {})
			},
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const stakers = stakersRecords.map((staker) => ({
			...staker,
			tvl: withTvl ? sharesToTVL(staker.shares, strategiesWithSharesUnderlying) : undefined
		}))

		res.send({
			data: stakers,
			meta: {
				total: stakersCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getStaker(req: Request, res: Response) {
	const result = WithTvlQuerySchema.and(WithRewardsQuerySchema).safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { withTvl, withRewards } = result.data

	try {
		const { address } = req.params

		const staker = await prisma.staker.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				...(withRewards
					? {
							operator: {
								include: {
									avs: {
										select: {
											avsAddress: true,
											isActive: true,
											avs: {
												select: {
													address: true,
													rewardSubmissions: true,
													restakeableStrategies: true,
													operators: {
														where: { isActive: true },
														include: {
															operator: {
																include: {
																	shares: true
																}
															}
														}
													}
												}
											}
										}
									},
									shares: { select: { strategyAddress: true, shares: true } }
								}
							}
					  }
					: {})
			}
		})

		const strategiesWithSharesUnderlying =
			withTvl || withRewards ? await getStrategiesWithShareUnderlying() : []
		const tvl = withTvl ? sharesToTVL(staker.shares, strategiesWithSharesUnderlying) : undefined
		const tvlStrategiesEth = withTvl
			? sharesToTVLStrategies(staker.shares, strategiesWithSharesUnderlying)
			: null

		res.send({
			...staker,
			tvl,
			rewards:
				withRewards && tvlStrategiesEth
					? await calculateStakerRewards(staker, tvlStrategiesEth)
					: undefined,
			operator: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawals(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				isCompleted: !!withdrawal.completedWithdrawal,
				updatedAt: withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				updatedAtBlock: withdrawal.completedWithdrawal?.createdAtBlock || withdrawal.createdAtBlock
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsQueued(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address.toLowerCase(), completedWithdrawal: null }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsWithdrawable(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params

		const viemClient = getViemClient()
		const minDelayBlocks = await prisma.settings.findUnique({
			where: { key: 'withdrawMinDelayBlocks' }
		})
		const minDelayBlock =
			(await viemClient.getBlockNumber()) - BigInt((minDelayBlocks?.value as string) || 0)

		const filterQuery = {
			stakerAddress: address.toLowerCase(),
			completedWithdrawal: null,
			createdAtBlock: { lte: minDelayBlock }
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsCompleted(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = {
			stakerAddress: address.toLowerCase(),
			NOT: {
				completedWithdrawal: null
			}
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				updatedAt: withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				updatedAtBlock: withdrawal.completedWithdrawal?.createdAtBlock || withdrawal.createdAtBlock
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerDeposits(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address.toLowerCase() }

		const depositCount = await prisma.deposit.count({
			where: filterQuery
		})
		const depositRecords = await prisma.deposit.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = depositRecords.map((deposit) => {
			return {
				...deposit
			}
		})

		res.send({
			data,
			meta: {
				total: depositCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Helper functions ---

async function calculateStakerRewards(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	staker: any,
	stakerTvlStrategiesEth: { [strategyAddress: string]: number }
) {
	try {
		const avsApyMap: Map<
			string,
			{
				strategies: {
					address: string
					apy: number
					tvlEth: number
					tokens: Map<string, number>
				}[]
			}
		> = new Map()
		const strategyApyMap: Map<
			string,
			{
				apy: number
				tvlEth: number
				tokens: Map<string, number>
			}
		> = new Map()

		// Grab the all reward submissions that the Staker is eligible for basis opted strategies & the Operator's opted AVSs
		const operatorStrategyAddresses: Set<string> = new Set(
			staker.operator?.shares.map((share) => share.strategyAddress.toLowerCase()) || []
		)

		const optedStrategyAddresses: Set<string> = new Set(
			Array.from(operatorStrategyAddresses).filter(
				(strategyAddress) => Number(stakerTvlStrategiesEth[strategyAddress]) > 0
			)
		)

		const avsWithEligibleRewardSubmissions = staker.operator?.avs
			.filter((avsOp) => avsOp.avs.rewardSubmissions.length > 0)
			.map((avsOp) => ({
				avs: avsOp.avs,
				eligibleRewards: avsOp.avs.rewardSubmissions.filter((reward) =>
					optedStrategyAddresses.has(reward.strategyAddress.toLowerCase())
				)
			}))
			.filter((item) => item.eligibleRewards.length > 0)

		if (!avsWithEligibleRewardSubmissions) {
			return {
				aggregateApy: '0',
				tokenRewards: [],
				strategyApys: [],
				avsApys: []
			}
		}

		const tokenPrices = await fetchTokenPrices()
		const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

		// Calc aggregate APY for each AVS basis the opted-in strategies
		for (const avs of avsWithEligibleRewardSubmissions) {
			const avsAddress = avs.avs.address.toLowerCase()

			// Get share amounts for each restakeable strategy
			const shares = withOperatorShares(avs.avs.operators).filter(
				(s) => avs.avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
			)

			// Fetch the AVS tvl for each strategy
			const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)

			// Iterate through each strategy and calculate all its rewards
			for (const strategyAddress of optedStrategyAddresses) {
				const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
				if (strategyTvl === 0) continue

				const tokenApyMap: Map<string, number> = new Map()
				const tokenRewards: Map<
					string,
					{
						totalRewardsEth: Prisma.Prisma.Decimal
						totalDuration: number
					}
				> = new Map()

				let strategyTotalRewardsEth = new Prisma.Prisma.Decimal(0)
				let strategyTotalDuration = 0

				// Find all reward submissions attributable to the strategy
				const relevantSubmissions = avs.eligibleRewards.filter(
					(submission) => submission.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
				)

				for (const submission of relevantSubmissions) {
					let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
					const rewardTokenAddress = submission.token.toLowerCase()

					if (rewardTokenAddress) {
						const tokenPrice = tokenPrices.find(
							(tp) => tp.address.toLowerCase() === rewardTokenAddress
						)
						rewardIncrementEth = submission.amount
							.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
							.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18)) // No decimals
					}

					// Multiply reward amount in ETH by the strategy weight
					rewardIncrementEth = rewardIncrementEth
						.mul(submission.multiplier)
						.div(new Prisma.Prisma.Decimal(10).pow(18))

					// Operator takes 10% in commission
					const operatorFeesEth = rewardIncrementEth.mul(10).div(100) // No decimals
					const netRewardEth = rewardIncrementEth.sub(operatorFeesEth)

					// Accumulate token-specific rewards and duration
					const tokenData = tokenRewards.get(rewardTokenAddress) || {
						totalRewardsEth: new Prisma.Prisma.Decimal(0),
						totalDuration: 0
					}
					tokenData.totalRewardsEth = tokenData.totalRewardsEth.add(netRewardEth)
					tokenData.totalDuration += submission.duration
					tokenRewards.set(rewardTokenAddress, tokenData)

					// Accumulate strategy totals
					strategyTotalRewardsEth = strategyTotalRewardsEth.add(netRewardEth)
					strategyTotalDuration += submission.duration
				}

				if (strategyTotalDuration === 0) continue

				// Calculate token APYs using accumulated values
				tokenRewards.forEach((data, tokenAddress) => {
					if (data.totalDuration !== 0) {
						const tokenRewardRate = data.totalRewardsEth.toNumber() / strategyTvl
						const tokenAnnualizedRate =
							tokenRewardRate * ((365 * 24 * 60 * 60) / data.totalDuration)
						const tokenApy = tokenAnnualizedRate * 100

						tokenApyMap.set(tokenAddress, tokenApy)
					}
				})

				// Calculate overall strategy APY summing token APYs
				const strategyApy = Array.from(tokenApyMap.values()).reduce((sum, apy) => sum + apy, 0)

				// Update strategy rewards map (across all AVSs)
				const currentStrategyRewards = strategyApyMap.get(strategyAddress) || {
					apy: 0,
					tvlEth: strategyTvl,
					tokens: new Map()
				}

				tokenApyMap.forEach((apy, tokenAddress) => {
					const currentTokenApy = currentStrategyRewards.tokens.get(tokenAddress) || 0
					currentStrategyRewards.tokens.set(tokenAddress, currentTokenApy + apy)
				})
				currentStrategyRewards.apy += strategyApy
				strategyApyMap.set(strategyAddress, currentStrategyRewards)

				// Update AVS rewards map
				const currentAvsRewards = avsApyMap.get(avsAddress) || { strategies: [] }
				currentAvsRewards.strategies.push({
					address: strategyAddress,
					tvlEth: strategyTvl,
					apy: strategyApy,
					tokens: tokenApyMap
				})
				avsApyMap.set(avsAddress, currentAvsRewards)
			}
		}

		// Build token amounts section
		const stakerRewardRecords = await prisma.stakerRewardSnapshot.findMany({
			where: {
				stakerAddress: staker.address.toLowerCase()
			}
		})

		const tokenAmounts = stakerRewardRecords.map((record) => ({
			tokenAddress: record.tokenAddress.toLowerCase(),
			cumulativeAmount: record.cumulativeAmount
		}))

		// Build strategies section
		const strategyApys = Array.from(strategyApyMap).map(([strategyAddress, data]) => ({
			strategyAddress,
			apy: data.apy,
			tokens: Array.from(data.tokens.entries()).map(([tokenAddress, apy]) => ({
				tokenAddress,
				apy
			}))
		}))

		// Build Avs section
		const avsApys = Array.from(avsApyMap).map(([avsAddress, data]) => {
			const strategies = data.strategies.map((s) => ({
				strategyAddress: s.address,
				apy: s.apy,
				tokens: Array.from(s.tokens).map(([tokenAddress, apy]) => ({
					tokenAddress,
					apy
				}))
			}))

			const totalTvl = strategies.reduce(
				(sum, s) => sum + Number(stakerTvlStrategiesEth[s.strategyAddress.toLowerCase()] || 0),
				0
			)
			const weightedApy = strategies.reduce((sum, s) => {
				const tvl = Number(stakerTvlStrategiesEth[s.strategyAddress.toLowerCase()] || 0)
				return sum + Number(s.apy) * (tvl / totalTvl)
			}, 0)

			return {
				avsAddress,
				apy: weightedApy,
				strategies
			}
		})

		return {
			aggregateApy: avsApys.reduce((sum, avs) => sum + avs.apy, 0),
			tokenAmounts,
			strategyApys,
			avsApys
		}
	} catch {}
}
