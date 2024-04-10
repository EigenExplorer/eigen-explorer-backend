import type { Request, Response } from 'express'
import prisma from '../../prisma/prismaClient'
import { getContract } from 'viem'
import { getViemClient } from '../../viem/viemClient'
import { strategyAbi } from '../../data/abi/strategy'
import { getEigenContracts } from '../../data/address'

/**
 * Route to get explorer metrics
 *
 * @param req
 * @param res
 */
export async function getMetrics(req: Request, res: Response) {
	try {
		res.send({
			...(await doGetTvl()),
			tvlBeaconChain: await doGetTvlBeaconChain(),
			totalAvs: await doGetTotalAvsCount(),
			totalOperators: await doGetTotalOperatorCount(),
			totalStakers: await doGetTotalStakerCount()
		})
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
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
		res.status(400).send('An error occurred while fetching data.')
	}
}

export async function getTvlBeaconChain(req: Request, res: Response) {
	try {
		const tvlBeaconChain = await doGetTvlBeaconChain()

		res.send({
			tvl: tvlBeaconChain
		})
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
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
		res.status(400).send('An error occurred while fetching data.')
	}
}

export async function getTvlRestakingByStrategy(req: Request, res: Response) {
	try {
		const { strategy } = req.params
		const strategies = Object.keys(getEigenContracts().Strategies)

		if (strategy && strategies.indexOf(strategy) !== -1) {
			const tvl = await doGetTvlStrategy(
				getEigenContracts().Strategies[strategy].strategyContract
			)

			res.send({
				tvl
			})
		}
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
	}
}

export async function getTotalAvs(req: Request, res: Response) {
	try {
		const totalAvs = await doGetTotalAvsCount()

		res.send({
			totalAvs
		})
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
	}
}

export async function getTotalOperators(req: Request, res: Response) {
	try {
		const totalOperators = await doGetTotalOperatorCount()

		res.send({
			totalOperators
		})
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
	}
}

export async function getTotalStakers(req: Request, res: Response) {
	try {
		const totalStakers = await doGetTotalStakerCount()

		res.send({
			totalStakers
		})
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
	}
}

// ================================================

async function doGetTvl() {
	let tvlRestaking = 0
	const tvlStrategies = {}
	const strategies = Object.keys(getEigenContracts().Strategies)

	for (const s of strategies) {
		const strategy = getEigenContracts().Strategies[s]
		const strategyTvl = await doGetTvlStrategy(strategy.strategyContract)

		tvlStrategies[s] = strategyTvl
		tvlRestaking += strategyTvl
	}

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
	const totalViews = await prisma.validator.aggregate({
		_sum: {
			effectiveBalance: true
		}
	})

	return Number(totalViews._sum.effectiveBalance) / 1e9
}

async function doGetTotalAvsCount() {
	return await prisma.avs.count()
}

async function doGetTotalOperatorCount() {
	return await prisma.operator.count()
}

async function doGetTotalStakerCount() {
	return 0
}
