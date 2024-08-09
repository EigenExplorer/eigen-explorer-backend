import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { getContract } from 'viem'
import { getViemClient } from '../../viem/viemClient'
import { strategyAbi } from '../../data/abi/strategy'
import {
	EigenStrategiesContractAddress,
	getEigenContracts
} from '../../data/address'
import { EigenExplorerApiError, handleAndReturnErrorResponse } from '../../schema/errors'
import { getAvsFilterQuery } from '../avs/avsController'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import { getStrategiesWithShareUnderlying } from '../strategies/strategiesController'
import { HistoricalCountSchema } from '../../schema/zod/schemas/historicalCountQuery'

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
			tvlStrategies: tvlRestaking.tvlStrategies,
			tvlStrategiesEth: tvlRestaking.tvlStrategiesEth
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTvlRestakingByStrategy(req: Request, res: Response) {
	try {
		const { strategy } = req.params

		const strategies = Object.keys(getEigenContracts().Strategies)
		const foundStrategy = strategies.find(
			(s) => s.toLowerCase() === strategy.toLowerCase()
		)

		if (!foundStrategy) {
			throw new EigenExplorerApiError({
			  code: 'unprocessable_entity',
			  message: 'invalid_string: Invalid Strategy',
			})
		  }

		const tvl = await doGetTvlStrategy(
			getEigenContracts().Strategies[foundStrategy].strategyContract
		)

		res.send({
			...tvl
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalAvs(req: Request, res: Response) {
	try {
		const total = await doGetTotalAvsCount()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalOperators(req: Request, res: Response) {
	try {
		const total = await doGetTotalOperatorCount()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalStakers(req: Request, res: Response) {
	try {
		const total = await doGetTotalStakerCount()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalWithdrawals(req: Request, res: Response) {
	try {
		const total = await doGetTotalWithdrawals()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getTotalDeposits(req: Request, res: Response) {
	try {
		const total = await doGetTotalDeposits()

		res.send({
			total
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getHistoricalAvsCount(req: Request, res: Response) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'avs',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getHistoricalOperatorCount(req: Request, res: Response) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'operator',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getHistoricalStakerCount(req: Request, res: Response) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'staker',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getHistoricalWithdrawalAggregate(
	req: Request,
	res: Response
) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalAggregate(
			'metricWithdrawalHourly',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getHistoricalDepositAggregate(
	req: Request,
	res: Response
) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalAggregate(
			'metricDepositHourly',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getHistoricalWithdrawalCount(
	req: Request,
	res: Response
) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'withdrawalQueued',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getHistoricalDepositCount(req: Request, res: Response) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'deposit',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// ================================================

async function doGetTvl() {
	let tvlRestaking = 0

	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategiesContracts = strategyKeys.map((s) =>
		getContract({
			address: getEigenContracts().Strategies[s].strategyContract,
			abi: strategyAbi,
			client: getViemClient()
		})
	)

	const tvlStrategies = {}
	const tvlStrategiesEth: Map<keyof EigenStrategiesContractAddress, number> =
		new Map(
			strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
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

					tvlStrategiesEth.set(
						s.strategyKey as keyof EigenStrategiesContractAddress,
						strategyTvl
					)

					tvlRestaking += strategyTvl
				}
			}
		})
	} catch (error) {}

	return {
		tvlRestaking,
		tvlStrategies,
		tvlStrategiesEth: Object.fromEntries(tvlStrategiesEth.entries())
	}
}

async function doGetTvlStrategy(strategy: `0x${string}`) {
	let tvl = 0
	let tvlEth = 0

	try {
		const strategyTokenPrices = await fetchStrategyTokenPrices()
		const strategyTokenPrice = Object.values(strategyTokenPrices).find(
			(stp) => stp.strategyAddress.toLowerCase() === strategy.toLowerCase()
		)

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

		if (strategyTokenPrice) {
			tvlEth = tvl * strategyTokenPrice.eth
		}
	} catch (error) {}

	return {
		tvl,
		tvlEth
	}
}

async function doGetTvlBeaconChain() {
	const totalValidators = await prisma.validator.aggregate({
		_sum: {
			balance: true
		}
	})

	return Number(totalValidators._sum.balance) / 1e9
}

async function doGetTotalAvsCount() {
	const timestampNow = new Date()
	const timestamp24h = new Date(
		new Date().setUTCHours(timestampNow.getUTCHours() - 24)
	)
	const timestamp7d = new Date(
		new Date().setUTCDate(timestampNow.getUTCDate() - 7)
	)

	const totalNow = await prisma.avs.count({
		where: getAvsFilterQuery(true)
	})
	const change24hValue = await prisma.avs.count({
		where: {
			createdAt: { gte: timestamp24h },
			...getAvsFilterQuery(true)
		}
	})
	const change7dValue = await prisma.avs.count({
		where: {
			createdAt: { gte: timestamp7d },
			...getAvsFilterQuery(true)
		}
	})

	const change24hPercent =
		change24hValue !== 0 ? Math.round((change24hValue / (totalNow - change24hValue)) * 1000) / 1000 : 0

	const change7dPercent =
		change7dValue !== 0 ? Math.round((change7dValue / (totalNow - change7dValue)) * 1000) / 1000 : 0

	return {
		total: totalNow,
		change24h: {
			value: change24hValue,
			percent: change24hPercent
		},
		change7d: {
			value: change7dValue,
			percent: change7dPercent
		}
	}
}

async function doGetTotalOperatorCount() {
	const timestampNow = new Date()
	const timestamp24h = new Date(
		new Date().setUTCHours(timestampNow.getUTCHours() - 24)
	)
	const timestamp7d = new Date(
		new Date().setUTCDate(timestampNow.getUTCDate() - 7)
	)

	const totalNow = await prisma.operator.count()
	const change24hValue = await prisma.operator.count({
		where: {
			createdAt: { gte: timestamp24h }
		}
	})
	const change7dValue = await prisma.operator.count({
		where: {
			createdAt: { gte: timestamp7d }
		}
	})

	const change24hPercent =
		change24hValue !== 0 ? Math.round((change24hValue / (totalNow - change24hValue)) * 1000) / 1000 : 0

	const change7dPercent =
		change7dValue !== 0 ? Math.round((change7dValue / (totalNow - change7dValue)) * 1000) / 1000 : 0

	return {
		total: totalNow,
		change24h: {
			value: change24hValue,
			percent: change24hPercent
		},
		change7d: {
			value: change7dValue,
			percent: change7dPercent
		}
	}
}

async function doGetTotalStakerCount() {
	const timestampNow = new Date()
	const timestamp24h = new Date(
		new Date().setUTCHours(timestampNow.getUTCHours() - 24)
	)
	const timestamp7d = new Date(
		new Date().setUTCDate(timestampNow.getUTCDate() - 7)
	)

	const totalNow = await prisma.staker.count({
		where: { operatorAddress: { not: null } }
	})
	const change24hValue = await prisma.staker.count({
		where: {
			createdAt: { gte: timestamp24h },
			operatorAddress: { not: null }
		}
	})
	const change7dValue = await prisma.staker.count({
		where: {
			createdAt: { gte: timestamp7d },
			operatorAddress: { not: null }
		}
	})

	const change24hPercent =
		change24hValue !== 0 ? Math.round((change24hValue / (totalNow - change24hValue)) * 1000) / 1000 : 0

	const change7dPercent =
		change7dValue !== 0 ? Math.round((change7dValue / (totalNow - change7dValue)) * 1000) / 1000 : 0

	return {
		total: totalNow,
		change24h: {
			value: change24hValue,
			percent: change24hPercent
		},
		change7d: {
			value: change7dValue,
			percent: change7dPercent
		}
	}
}

async function doGetTotalWithdrawals() {
	const total = await prisma.withdrawalQueued.count()
	const completed = await prisma.withdrawalCompleted.count()
	const pending = total - completed

	return {
		total,
		pending,
		completed
	}
}

async function doGetTotalDeposits() {
	const deposits = await prisma.deposit.count()

	return deposits
}

async function doGetHistoricalCount(
	modelName: string,
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	if (
		!['avs', 'operator', 'staker', 'withdrawalQueued', 'deposit'].includes(
			modelName
		)
	) {
		throw new Error('Invalid model name')
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const model = prisma[modelName] as any

	const startDate = resetTime(new Date(startAt))
	const endDate = resetTime(new Date(endAt))

	const initialTally = await model.count({
		where: {
			createdAt: {
				lt: startDate
			}
		}
	})

	const modelData = await model.findMany({
		select: {
			createdAt: true
		},
		where: {
			createdAt: {
				gte: startDate,
				lte: endDate
			}
		},
		orderBy: {
			createdAt: 'asc'
		}
	})

	const results: { timestamp: string; value: number }[] = []
	const timeInterval =
		{
			'1h': 3600000,
			'1d': 86400000,
			'7d': 604800000
		}[frequency] || 3600000
	let currentDate = startDate
	let tally = initialTally

	while (currentDate <= endDate) {
		const nextDate = new Date(currentDate.getTime() + timeInterval)

		const intervalData = modelData.filter(
			(data) => data.createdAt >= currentDate && data.createdAt < nextDate
		)

		if (variant === 'discrete') {
			results.push({
				timestamp: new Date(Number(currentDate)).toISOString(),
				value: intervalData.length
			})
		} else {
			tally += intervalData.length
			results.push({
				timestamp: new Date(Number(currentDate)).toISOString(),
				value: tally
			})
		}

		currentDate = nextDate
	}

	return results
}

async function doGetHistoricalAggregate(
	modelName: string,
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	if (!['metricWithdrawalHourly', 'metricDepositHourly'].includes(modelName)) {
		throw new Error('Invalid model name')
	}

	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))
	let currentTimestamp = startTimestamp

	const results: {
		timestamp: string
		tvlEth: number
	}[] = []
	const timeInterval =
		{
			'1h': 3600000,
			'1d': 86400000,
			'7d': 604800000
		}[frequency] || 3600000

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const model = prisma[modelName] as any

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let hourlyData: any[] = []

	hourlyData = await model.findMany({
		where: {
			timestamp: {
				gte: startTimestamp,
				lte: endTimestamp
			}
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	let tvlEth = 0

	// Set the first tvlEth value to prevent the first n responses returning 0 in case no records exist for the first n timestamps
	if (variant === 'cumulative') {
		if (hourlyData[0].timestamp.getTime() === startTimestamp.getTime()) {
			tvlEth = hourlyData[0].tvlEth
		} else {
			const result = await model.findFirst({
				select: {
					tvlEth: true
				},
				where: {
					timestamp: {
						lt: startTimestamp
					}
				},
				orderBy: {
					timestamp: 'desc'
				}
			})

			tvlEth = result ? Number(result.tvlEth) : 0
		}
	}

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + timeInterval)
		const intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		if (variant === 'cumulative') {
			if (intervalData.length > 0) {
				tvlEth = intervalData[intervalData.length - 1].tvlEth
			} // If no records exist in the time period, previous tvlEth value is returned
		} else {
			tvlEth = intervalData.reduce((sum, record) => {
				return sum + record.changeTvlEth
			}, 0)
		}

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth: Number(tvlEth)
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

// Trim timestamp
function resetTime(date: Date) {
	date.setUTCMinutes(0, 0, 0)
	return date
}
