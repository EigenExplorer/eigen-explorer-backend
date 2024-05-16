import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { getContract } from 'viem'
import { getViemClient } from '../../viem/viemClient'
import { strategyAbi } from '../../data/abi/strategy'
import { getEigenContracts } from '../../data/address'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { getAvsFilterQuery } from '../avs/avsController'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import { getStrategiesWithShareUnderlying } from '../strategies/strategiesController'

/**
 * Route to get explorer metrics
 *
 * @param req
 * @param res
 */
export async function getMetrics(req: Request, res: Response) {
	try {
		const tvlRestaking = await doGetTvl()
		const tvlBeaconChain = await doGetTvlBeaconChain()

		res.send({
			tvl: tvlRestaking.tvlRestaking + tvlBeaconChain,
			tvlBeaconChain: await doGetTvlBeaconChain(),
			...tvlRestaking,
			totalAvs: await doGetTotalAvsCount(),
			totalOperators: await doGetTotalOperatorCount(),
			totalStakers: await doGetTotalStakerCount()
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTvl(req: Request, res: Response) {
	try {
		const tvlRestaking = (await doGetTvl()).tvlRestaking
		const tvlBeaconChain = await doGetTvlBeaconChain()

		res.send({
			tvl: tvlRestaking + tvlBeaconChain
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTvlBeaconChain(req: Request, res: Response) {
	try {
		const tvlBeaconChain = await doGetTvlBeaconChain()

		res.send({
			tvl: tvlBeaconChain
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTvlRestaking(req: Request, res: Response) {
	try {
		const tvlRestaking = await doGetTvl()

		res.send({
			tvl: tvlRestaking.tvlRestaking,
			tvlStrategies: tvlRestaking.tvlStrategies
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTvlRestakingByStrategy(req: Request, res: Response) {
	try {
		const { strategy } = req.params

		if (!strategy) {
			throw new Error('Invalid strategy name.')
		}

		const strategies = Object.keys(getEigenContracts().Strategies)
		const foundStrategy = strategies.find(s => s.toLowerCase() === strategy.toLowerCase())

		if (!foundStrategy) {
			throw new Error('Invalid strategy.')
		}

		const tvl = await doGetTvlStrategy(
			getEigenContracts().Strategies[foundStrategy].strategyContract
		)

		res.send({
			tvl
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalAvs(req: Request, res: Response) {
	try {
		const totalAvs = await doGetTotalAvsCount()

		res.send({
			totalAvs
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalOperators(req: Request, res: Response) {
	try {
		const totalOperators = await doGetTotalOperatorCount()

		res.send({
			totalOperators
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalStakers(req: Request, res: Response) {
	try {
		const totalStakers = await doGetTotalStakerCount()

		res.send({
			totalStakers
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// ================================================

async function doGetTvl() {
	let tvlRestaking = 0
	const tvlStrategies = {}
	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategiesContracts = strategyKeys.map((s) =>
		getContract({
			address: getEigenContracts().Strategies[s].strategyContract,
			abi: strategyAbi,
			client: getViemClient()
		})
	)

	try {
		const totalShares = await Promise.all(
			strategiesContracts.map(async (sc, i) => ({
				strategyKey: strategyKeys[i],
				strategyAddress: sc.address.toLowerCase(),
				shares: (await sc.read.totalShares()) as string
			}))
		)

		const strategiesWithSharesUnderlying =
			await getStrategiesWithShareUnderlying()
		const strategyTokenPrices = await fetchStrategyTokenPrices()

		totalShares.map((s) => {
			const strategyTokenPrice = Object.values(strategyTokenPrices).find(
				(stp) =>
					stp.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
			)
			const sharesUnderlying = strategiesWithSharesUnderlying.find(
				(su) =>
					su.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
			)

			if (sharesUnderlying) {
				const strategyShares =
					Number(
						(BigInt(s.shares) * BigInt(sharesUnderlying.sharesToUnderlying)) /
							BigInt(1e18)
					) / 1e18

				tvlStrategies[s.strategyKey] = strategyShares

				if (strategyTokenPrice) {
					const strategyTvl = strategyShares * strategyTokenPrice.eth

					tvlRestaking += strategyTvl
				}
			}
		})
	} catch (error) {}

	return {
		tvlRestaking,
		tvlStrategies
	}
}

async function doGetTvlStrategy(strategy: `0x${string}`) {
	let tvl = 0

	try {
		const contract = getContract({
			address: strategy,
			abi: strategyAbi,
			client: getViemClient()
		})

		tvl =
			Number(
				await contract.read.sharesToUnderlyingView([
					await contract.read.totalShares()
				])
			) / 1e18
	} catch (error) {}

	return tvl
}

async function doGetTvlBeaconChain() {
	const totalValidators = await prisma.validator.count()

	return totalValidators * 32
}

async function doGetTotalAvsCount() {
	return await prisma.avs.count({ where: getAvsFilterQuery(true) })
}

async function doGetTotalOperatorCount() {
	return await prisma.operator.count()
}

async function doGetTotalStakerCount() {
	const stakers = await prisma.staker.count({
		where: { operatorAddress: { not: null } }
	})

	return stakers
}
