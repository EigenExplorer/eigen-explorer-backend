import type { Request, Response } from 'express'
import type Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { getEigenContracts } from '../../data/address'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { getAvsFilterQuery } from '../avs/avsController'
import { HistoricalCountSchema } from '../../schema/zod/schemas/historicalCountQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import { meterTestnet } from 'viem/chains'
import { timeStamp } from 'console'

type HistoricalTvlRecord = {
	timestamp: string
	tvlEth: number
}
type HistoricalAggregateRecord = {
	timestamp: string
	tvlEth: number
	totalStakers: number
	totalOperators?: number
	totalAvs?: number
}

// Models with tvl denominated in ETH
type EthTvlModelMap = {
	metricDepositHourly: Prisma.MetricDepositHourly
	metricWithdrawalHourly: Prisma.MetricWithdrawalHourly
	metricEigenPodsHourly: Prisma.MetricEigenPodsHourly
}
type EthTvlModelName = keyof EthTvlModelMap

// Models with tvl denominated in their own native token
type NativeTvlModelMap = {
	metricStrategyHourly: Prisma.MetricStrategyHourly
	metricAvsStrategyHourly: Prisma.MetricAvsStrategyHourly
	metricOperatorStrategyHourly: Prisma.MetricOperatorStrategyHourly
}
type NativeTvlModelName = keyof NativeTvlModelMap

type MetricModelMap = EthTvlModelMap & NativeTvlModelMap
type MetricModelName = keyof (EthTvlModelMap & NativeTvlModelMap)

type AggregateModelMap = {
	metricAvsHourly: Prisma.MetricAvsHourly
	metricOperatorHourly: Prisma.MetricOperatorHourly
}
type AggregateModelName = keyof AggregateModelMap

const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'

/* 
========================
====== All Routes ======
======================== 
*/

// --- Holistic Routes ---

/**
 * Function for route /
 * Returns all TVL metrics & count metrics for AVS, Operator & Stakers
 *
 * @param req
 * @param res
 */
export async function getMetrics(req: Request, res: Response) {
	try {
		const [
			tvlRestaking,
			tvlBeaconChain,
			totalAvs,
			totalOperators,
			totalStakers
		] = await Promise.all([
			doGetTvlRestaking(false),
			doGetTvlBeaconChain(),
			doGetTotalAvsCount(),
			doGetTotalOperatorCount(),
			doGetTotalStakerCount()
		])

		const metrics = {
			tvlRestaking,
			tvlBeaconChain,
			totalAvs,
			totalOperators,
			totalStakers
		}

		res.send({
			tvl:
				(metrics.tvlRestaking ? metrics.tvlRestaking.tvlRestaking.tvl : 0) +
				(metrics.tvlBeaconChain ? metrics.tvlBeaconChain.tvl : 0),
			tvlBeaconChain: metrics.tvlBeaconChain,
			...metrics.tvlRestaking,
			totalAvs: metrics.totalAvs,
			totalOperators: metrics.totalOperators,
			totalStakers: metrics.totalStakers
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- TVL Routes ---

/**
 * Function for route /tvl
 * Returns total EL TVL along with 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTvl(req: Request, res: Response) {
	try {
		const tvlRestaking = (await doGetTvlRestaking(false)).tvlRestaking
		const tvlBeaconChain = await doGetTvlBeaconChain()

		res.send({
			tvl: tvlRestaking.tvl + tvlBeaconChain.tvl,
			change24h: {
				value: tvlRestaking.change24h.value + tvlBeaconChain.change24h.value,
				percent:
					tvlRestaking.change24h.percent + tvlBeaconChain.change24h.percent
			},
			change7d: {
				value: tvlRestaking.change7d.value + tvlBeaconChain.change7d.value,
				percent: tvlRestaking.change7d.percent + tvlBeaconChain.change7d.percent
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /tvl/beacon-chain
 * Returns Beacon Chain TVL along with 24h/7d change
 *
 * @param req
 * @param res
 */
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

/**
 * Function for route /tvl/restaking
 * Returns Liquid Staking TVL along with 24h/7d change
 * Note: This TVL value includes Beacon ETH that's restaked (which is different from TVL Beacon Chain)
 *
 * @param req
 * @param res
 */
export async function getTvlRestaking(req: Request, res: Response) {
	try {
		const tvlRestaking = await doGetTvlRestaking(true)

		res.send({
			tvl: tvlRestaking.tvlRestaking,
			tvlStrategies: tvlRestaking.tvlStrategies,
			tvlStrategiesEth: tvlRestaking.tvlStrategiesEth
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /tvl/restaking/:strategy
 * Returns strategy TVL along with 24h/7d change for any given strategy address
 *
 * @param req
 * @param res
 */
export async function getTvlRestakingByStrategy(req: Request, res: Response) {
	try {
		const { strategy } = req.params

		if (!strategy) {
			throw new Error('Invalid strategy name.')
		}

		const strategies = Object.keys(getEigenContracts().Strategies)
		const foundStrategy = strategies.find(
			(s) => s.toLowerCase() === strategy.toLowerCase()
		)

		if (!foundStrategy) {
			throw new Error('Invalid strategy.')
		}

		const tvl = await doGetTvlRestaking(
			true,
			getEigenContracts().Strategies[foundStrategy].strategyContract
		)

		res.send({
			...tvl
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Total Routes ---

/**
 * Function for route /total-avs
 * Returns number of whitelisted AVSs along with 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalAvs(req: Request, res: Response) {
	try {
		const total = await doGetTotalAvsCount()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-operators
 * Returns number of Operators along with 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalOperators(req: Request, res: Response) {
	try {
		const total = await doGetTotalOperatorCount()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-stakers
 * Returns number of Stakers along with 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalStakers(req: Request, res: Response) {
	try {
		const total = await doGetTotalStakerCount()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-withdrawals
 * Returns number total, pending and completed Withdrawals
 *
 * @param req
 * @param res
 */
export async function getTotalWithdrawals(req: Request, res: Response) {
	try {
		const total = await doGetTotalWithdrawals()

		res.send(total)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-deposits
 * Returns number total Deposits
 *
 * @param req
 * @param res
 */
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

// --- Historical TVL Routes ---

/**
 * Function for route /historical/tvl
 * Returns total EL TVL in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvl(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlTotal(
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

/**
 * Function for route /historical/tvl/beacon-chain
 * Returns total Beacon Chain TVL in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlBeaconChain(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlBeacon(
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

/**
 * Function for route /historical/restaking/:address
 * Returns Liquid Staking TVL for a given strategy in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlRestaking(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlRestaking(
			startAt,
			endAt,
			frequency,
			variant,
			address
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/withdrawals
 * Returns completed withdrawals TVL (net outflow from EL) in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlWithdrawal(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlWithdrawalDeposit(
			'metricWithdrawalHourly' as MetricModelName,
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

/**
 * Function for route /historical/deposits
 * Returns deposits TVL in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlDeposit(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlWithdrawalDeposit(
			'metricDepositHourly' as MetricModelName,
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

// --- Historical Aggregate Routes ---

/**
 * Function for route /historical/avs/:address
 * Returns TVL in ETH, totalOperators and totalStakers for a given whitelisted AVS in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalAvsAggregate(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalAvsAggregate(
			address,
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

/**
 * Function for route /historical/operators/:address
 * Returns TVL in ETH, totalAvs and totalStakers for a given Operator in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalOperatorsAggregate(
	req: Request,
	res: Response
) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalOperatorsAggregate(
			address,
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

// --- Historical Count Routes ---

/**
 * Function for route /historical/count-avs
 * Returns total number of whitelisted AVSs in historical format
 *
 * @param req
 * @param res
 */
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

/**
 * Function for route /historical/count-operators
 * Returns total number of Operators in historical format
 *
 * @param req
 * @param res
 */
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

/**
 * Function for route /historical/count-stakers
 * Returns total number of Stakers in historical format
 *
 * @param req
 * @param res
 */
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

/**
 * Function for route /historical/count-withdrawals
 * Returns total number of queued withdrawals in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalWithdrawalCount(
	req: Request,
	res: Response
) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
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

/**
 * Function for route /historical/count-deposits
 * Returns total number of deposits in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalDepositCount(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
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

/*
============================
=== Processing Functions ===
============================
*/

// --- TVL Routes ---

/**
 * Processes total restaking TVL, 24h/7d change and individual strategy TVLs, with the option to restrict to 1 strategy
 * Optionally, can choose to exclude restaked Beacon ETH in total TVL calc (done in getTvl() where total Beacon Chain ETH is considered instead)
 * Used by getMetrics(), getTvl() & getTvlRestaking()
 *
 * @param strategy
 * @param excludeBeaconFromTvl
 * @returns
 */
async function doGetTvlRestaking(includeBeaconInTvl = true, strategy?: string) {
	const [strategyRecords, strategyPriceMap] = await Promise.all([
		fetchLatestStrategyData(strategy),
		fetchCurrentEthPrices()
	])

	const {
		totalTvl,
		totalTvl24hOffset,
		totalTvl7dOffset,
		tvlStrategies,
		tvlStrategiesEth
	} = Array.from(strategyRecords.entries()).reduce(
		(acc, [strategyAddress, records]) => {
			const ethPrice = strategyPriceMap.get(strategyAddress) || 0
			const addToTvl = includeBeaconInTvl || strategyAddress !== beaconAddress // Only use Beacon TVL in total TVL & change calc if required

			const latestRecord = records['']
			const record24h = records['24h']
			const record7d = records['7d']

			if (latestRecord) {
				const tvlEth = Number(latestRecord.tvl) * ethPrice
				if (addToTvl) acc.totalTvl += tvlEth
				acc.tvlStrategies[strategyAddress] = Number(latestRecord.tvl)
				acc.tvlStrategiesEth[strategyAddress] = tvlEth
			}

			if (record24h && addToTvl) {
				acc.totalTvl24hOffset += Number(record24h.tvl) * ethPrice
			}

			if (record7d && addToTvl) {
				acc.totalTvl7dOffset += Number(record7d.tvl) * ethPrice
			}

			return acc
		},
		{
			totalTvl: 0,
			totalTvl24hOffset: 0,
			totalTvl7dOffset: 0,
			tvlStrategies: {} as { [key: string]: number },
			tvlStrategiesEth: {} as { [key: string]: number }
		}
	)

	return {
		tvlRestaking: calculateTvlChanges(
			totalTvl,
			totalTvl24hOffset,
			totalTvl7dOffset
		),
		tvlStrategies,
		tvlStrategiesEth
	}

	// Function to get restaking data for each timeOffset for all relevant strategies
	async function fetchLatestStrategyData(strategy?: string) {
		const timeOffsets = ['', '24h', '7d']

		// Grab the earliest timestamp of all relevant strategies before 7d ago
		const strategyTimestamps = await prisma.metricStrategyHourly.groupBy({
			by: ['strategyAddress'],
			where: {
				timestamp: {
					lte: getTimestamp('7d')
				},
				...(strategy ? { strategyAddress: strategy } : {})
			},
			_min: {
				timestamp: true
			}
		})

		// Find the earliest timestamp from the group
		const earliestTimestamp = strategyTimestamps.reduce(
			(earliest, current) => {
				if (earliest === null) return current._min.timestamp
				if (current._min.timestamp === null) return earliest
				return current._min.timestamp < earliest
					? current._min.timestamp
					: earliest
			},
			null as Date | null
		)

		// Retrieve all records from the earliest timestamp
		const records = await prisma.metricStrategyHourly.findMany({
			where: {
				timestamp: {
					gte: earliestTimestamp || getTimestamp('7d')
				},
				...(strategy ? { strategyAddress: strategy } : {})
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		// Group records by strategy address
		const recordsByStrategy = records.reduce(
			(acc, record) => {
				if (!acc[record.strategyAddress]) {
					acc[record.strategyAddress] = []
				}
				acc[record.strategyAddress].push(record)
				return acc
			},
			{} as Record<string, typeof records>
		)

		// Return earliest record before 7d, 24h and latest record for each strategy
		const result = new Map<string, Record<string, (typeof records)[0]>>()

		for (const [strategyAddress, strategyRecords] of Object.entries(
			recordsByStrategy
		)) {
			const selectedRecords: Record<string, (typeof records)[0]> = {}

			for (const offset of timeOffsets) {
				const targetTime = getTimestamp(offset)
				const record = strategyRecords.reduce(
					(closest, current) => {
						if (offset === '') {
							return current.timestamp > (closest?.timestamp || new Date(0))
								? current
								: closest
						}
						return current.timestamp <= targetTime &&
							current.timestamp > (closest?.timestamp || new Date(0))
							? current
							: closest
					},
					null as (typeof records)[0] | null
				)

				if (record) {
					selectedRecords[offset] = record
				}
			}

			result.set(strategyAddress, selectedRecords)
		}

		return result
	}
}

/**
 * Processes total TVL and 24h/7d change for Beacon Chain ETH
 * Used by getMetrics() & getBeaconChainTvl()
 *
 * @returns
 */
async function doGetTvlBeaconChain() {
	const timeOffsets = ['', '24h', '7d']

	const beaconRecordsPromises = timeOffsets.map((tf) => {
		return prisma.metricEigenPodsHourly.findFirst({
			where: {
				timestamp: { lte: getTimestamp(tf) }
			},
			orderBy: { timestamp: 'desc' }
		})
	})

	const beaconRecords = await Promise.all(beaconRecordsPromises)

	const [currentTvl, tvl24hOffset, tvl7dOffset] = beaconRecords.map((record) =>
		Number(record?.tvlEth ?? 0)
	)

	return calculateTvlChanges(currentTvl, tvl24hOffset, tvl7dOffset)
}

// --- Total Routes ---

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
		change24hValue !== 0
			? Math.round((change24hValue / (totalNow - change24hValue)) * 1000) / 1000
			: 0

	const change7dPercent =
		change7dValue !== 0
			? Math.round((change7dValue / (totalNow - change7dValue)) * 1000) / 1000
			: 0

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
		change24hValue !== 0
			? Math.round((change24hValue / (totalNow - change24hValue)) * 1000) / 1000
			: 0

	const change7dPercent =
		change7dValue !== 0
			? Math.round((change7dValue / (totalNow - change7dValue)) * 1000) / 1000
			: 0

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
		change24hValue !== 0
			? Math.round((change24hValue / (totalNow - change24hValue)) * 1000) / 1000
			: 0

	const change7dPercent =
		change7dValue !== 0
			? Math.round((change7dValue / (totalNow - change7dValue)) * 1000) / 1000
			: 0

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

// --- Historical TVL Routes ---

/**
 * Processes total TVL in historical format
 * Calculates total TVL by combining historical total Beacon Chain ETH TVL with restaking TVL (without restaked Beacon Chain ETH)
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 */
async function doGetHistoricalTvlTotal(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	// Get historical tvl data for Beacon Chain ETH and LSTs (excluding restaked Beacon Chain ETH)
	const [beaconTvl, restakingTvl] = await Promise.all([
		doGetHistoricalTvlBeacon(startAt, endAt, frequency, variant),
		doGetHistoricalTvlRestaking(
			startAt,
			endAt,
			frequency,
			variant,
			undefined,
			false
		)
	])

	// Combine the results
	const results = beaconTvl.map((beaconEntry, index) => {
		const restakingEntry = restakingTvl[index]
		if (!restakingEntry || beaconEntry.timestamp !== restakingEntry.timestamp) {
			throw new Error(`Mismatch in historical data at index ${index}`)
		}

		return {
			timestamp: beaconEntry.timestamp,
			tvlEth: beaconEntry.tvlEth + restakingEntry.tvlEth
		}
	})

	return results as HistoricalTvlRecord[]
}

/**
 * Processes total Beacon Chain ETH TVL in historical format
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 */
async function doGetHistoricalTvlBeacon(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))

	// Fetch the timestamp of the first record on or before startTimestamp
	const initialDataTimestamp = await prisma.metricEigenPodsHourly.findFirst({
		where: {
			timestamp: {
				lte: startTimestamp
			}
		},
		orderBy: {
			timestamp: 'desc'
		}
	})

	// Fetch all records from the initialDataTimestamp
	const hourlyData = await prisma.metricEigenPodsHourly.findMany({
		where: {
			timestamp: {
				gte: initialDataTimestamp?.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
				lte: endTimestamp
			}
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	const results: HistoricalTvlRecord[] = []
	const modelName = 'metricEigenPodsHourly' as MetricModelName

	let tvlEth = variant === 'cumulative' ? Number(hourlyData[0].tvlEth) : 0

	const offset = getOffsetInMs(frequency)
	let currentTimestamp = startTimestamp

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)
		const intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		tvlEth = calculateTvlForHistoricalRecord(
			intervalData,
			variant,
			tvlEth,
			modelName
		)

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

/**
 * Processes restaking TVL in historical format with option
 * Calculates total TVL using restaked Beacon Chain ETH, not total Beacon Chain ETH
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 */
async function doGetHistoricalTvlRestaking(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string,
	address?: string,
	includeBeaconInTvl = true
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))
	const modelName = 'metricStrategyHourly' as MetricModelName

	const ethPrices = await fetchCurrentEthPrices()

	// Fetch the timestamp of the first record on or before startTimestamp
	const initialDataTimestamps = await prisma.metricStrategyHourly.groupBy({
		by: ['strategyAddress'],
		_max: {
			timestamp: true
		},
		where: {
			timestamp: {
				lte: startTimestamp
			},
			...(address && { strategyAddress: address.toLowerCase() }),
			...(!includeBeaconInTvl && { strategyAddress: { not: beaconAddress } })
		}
	})

	// For every strategyAddress, fetch all records from the initialDataTimestamp
	const hourlyData = await prisma.metricStrategyHourly.findMany({
		where: {
			OR: initialDataTimestamps.map((metric) => ({
				AND: [
					{
						strategyAddress: metric.strategyAddress
					},
					{
						timestamp: {
							gte: metric._max.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
							lte: endTimestamp
						}
					}
				]
			})) as Prisma.Prisma.MetricStrategyHourlyWhereInput[]
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	let tvlEth =
		variant === 'cumulative'
			? await getInitialTvlCumulativeFromNative(hourlyData, ethPrices)
			: 0

	const strategyAddresses = [
		...new Set(hourlyData.map((data) => data.strategyAddress))
	]

	const results: HistoricalTvlRecord[] = []

	const offset = getOffsetInMs(frequency)
	let currentTimestamp = startTimestamp

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)
		let intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		const presentAddresses = new Set(
			intervalData.map((data) => data.strategyAddress)
		)

		// For each unique strategy address not present in this interval, add its latest record
		const missingRecords = strategyAddresses.flatMap((address) => {
			if (!presentAddresses.has(address)) {
				const latestRecord = hourlyData
					.filter(
						(data) =>
							data.strategyAddress === address && data.timestamp < nextTimestamp
					)
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

				return latestRecord ? [latestRecord] : []
			}
			return []
		})

		intervalData = [...intervalData, ...missingRecords]

		tvlEth = calculateTvlForHistoricalRecord(
			intervalData,
			variant,
			tvlEth,
			modelName,
			ethPrices
		)

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

/**
 * Processes withdrawals/deposits TVL in historical format
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalTvlWithdrawalDeposit(
	modelName: MetricModelName,
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))

	const hourlyData = await prisma.metricWithdrawalHourly.findMany({
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

	const results: HistoricalTvlRecord[] = []

	// MetricHourly records are created only when activity is detected, not necessarily for all timestamps. If cumulative, we may need to set initial tvl value
	let tvlEth =
		variant === 'cumulative'
			? await getInitialTvlCumulative(startTimestamp, hourlyData, modelName)
			: 0

	const offset = getOffsetInMs(frequency)
	let currentTimestamp = startTimestamp

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)
		const intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		tvlEth = calculateTvlForHistoricalRecord(
			intervalData,
			variant,
			tvlEth,
			modelName
		)

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

// --- Historical Aggregate Routes ---

/**
 * Processes TVL in ETH, totalStakers & totalOperators in historical format
 *
 * @param address
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalAvsAggregate(
	address: string,
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))
	const modelNameTvl = 'metricAvsStrategyHourly' as MetricModelName

	const ethPrices = await fetchCurrentEthPrices()

	// Fetch initial data for metrics calculation
	const processMetricHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamp = await prisma.metricAvsHourly.groupBy({
			by: ['avsAddress'],
			_max: {
				timestamp: true
			},
			where: {
				timestamp: {
					lte: startTimestamp
				},
				avsAddress: address.toLowerCase()
			}
		})

		// Fetch all records from the initialDataTimestamp
		const hourlyData = await prisma.metricAvsHourly.findMany({
			where: {
				avsAddress: address.toLowerCase(),
				timestamp: {
					gte: initialDataTimestamp[0]._max.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
					lte: endTimestamp
				}
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		let totalStakers = 0
		let totalOperators = 0

		if (variant === 'cumulative' && initialDataTimestamp[0]._max.timestamp) {
			totalStakers = hourlyData[0].totalStakers
			totalOperators = hourlyData[0].totalOperators
		}

		return { hourlyData, totalStakers, totalOperators }
	}

	// Fetch initial data for tvlEth calculation
	const processMetricStrategyHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamps = await prisma.metricAvsStrategyHourly.groupBy({
			by: ['avsAddress', 'strategyAddress'],
			_max: {
				timestamp: true
			},
			where: {
				timestamp: {
					lte: startTimestamp
				},
				avsAddress: address.toLowerCase()
			}
		})

		// For every strategyAddress, fetch all records from the initialDataTimestamp
		const strategyData = await prisma.metricAvsStrategyHourly.findMany({
			where: {
				OR: initialDataTimestamps.map((metric) => ({
					AND: [
						{
							avsAddress: metric.avsAddress,
							strategyAddress: metric.strategyAddress
						},
						{
							timestamp: {
								gte: metric._max.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
								lte: endTimestamp
							}
						}
					]
				})) as Prisma.Prisma.MetricAvsStrategyHourlyWhereInput[]
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		const tvlEth =
			variant === 'cumulative'
				? await getInitialTvlCumulativeFromNative(strategyData, ethPrices)
				: 0

		return { strategyData, tvlEth }
	}

	let [{ hourlyData, totalOperators, totalStakers }, { strategyData, tvlEth }] =
		await Promise.all([
			processMetricHourlyData(),
			processMetricStrategyHourlyData()
		])

	const strategyAddresses = [
		...new Set(strategyData.map((data) => data.strategyAddress))
	]

	const results: HistoricalAggregateRecord[] = []
	let currentTimestamp = startTimestamp
	const offset = getOffsetInMs(frequency)

	// Process results per timestamp
	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)

		const intervalHourlyData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// Calculate metrics data for the current timestamp
		const { totalStakers: newStakers, totalOperators: newOperators } =
			await calculateMetricsForHistoricalRecord(
				intervalHourlyData,
				variant,
				totalStakers,
				totalOperators
			)

		totalStakers = newStakers
		totalOperators = newOperators

		let intervalStrategyData = strategyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// For each unique strategy address not present in this interval, add its latest record
		const presentAddresses = new Set(
			intervalStrategyData.map((data) => data.strategyAddress)
		)
		const missingRecords = strategyAddresses.flatMap((address) => {
			if (!presentAddresses.has(address)) {
				const latestRecord = strategyData
					.filter(
						(data) =>
							data.strategyAddress === address && data.timestamp < nextTimestamp
					)
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

				return latestRecord ? [latestRecord] : []
			}
			return []
		})
		intervalStrategyData = [...intervalStrategyData, ...missingRecords]

		// Calculate tvl data for the current timestamp
		tvlEth = calculateTvlForHistoricalRecord(
			intervalStrategyData,
			variant,
			tvlEth,
			modelNameTvl,
			ethPrices
		)
		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth,
			totalStakers,
			totalOperators
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

/**
 * Processes TVL in ETH, totalStakers & totalOperators in historical format
 *
 * @param address
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalOperatorsAggregate(
	address: string,
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))
	const modelNameTvl = 'metricOperatorStrategyHourly' as MetricModelName

	const ethPrices = await fetchCurrentEthPrices()

	// Fetch initial data for metrics calculation
	const processMetricHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamp = await prisma.metricOperatorHourly.groupBy({
			by: ['operatorAddress'],
			_max: {
				timestamp: true
			},
			where: {
				timestamp: {
					lte: startTimestamp
				},
				operatorAddress: address.toLowerCase()
			}
		})

		// Fetch all records from the initialDataTimestamp
		const hourlyData = await prisma.metricOperatorHourly.findMany({
			where: {
				operatorAddress: address.toLowerCase(),
				timestamp: {
					gte: initialDataTimestamp[0]._max.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
					lte: endTimestamp
				}
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		let totalStakers = 0
		let totalAvs = 0

		if (variant === 'cumulative' && initialDataTimestamp[0]._max.timestamp) {
			totalStakers = hourlyData[0].totalStakers
			totalAvs = hourlyData[0].totalAvs
		}

		return { hourlyData, totalStakers, totalAvs }
	}

	// Fetch initial data for tvlEth calculation
	const processMetricStrategyHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamps =
			await prisma.metricOperatorStrategyHourly.groupBy({
				by: ['operatorAddress', 'strategyAddress'],
				_max: {
					timestamp: true
				},
				where: {
					timestamp: {
						lte: startTimestamp
					},
					operatorAddress: address.toLowerCase()
				}
			})

		// For every strategyAddress, fetch all records from the initialDataTimestamp
		const strategyData = await prisma.metricOperatorStrategyHourly.findMany({
			where: {
				OR: initialDataTimestamps.map((metric) => ({
					AND: [
						{
							operatorAddress: metric.operatorAddress,
							strategyAddress: metric.strategyAddress
						},
						{
							timestamp: {
								gte: metric._max.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
								lte: endTimestamp
							}
						}
					]
				})) as Prisma.Prisma.MetricOperatorStrategyHourlyWhereInput[]
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		const tvlEth =
			variant === 'cumulative'
				? await getInitialTvlCumulativeFromNative(strategyData, ethPrices)
				: 0

		return { strategyData, tvlEth }
	}

	let [{ hourlyData, totalAvs, totalStakers }, { strategyData, tvlEth }] =
		await Promise.all([
			processMetricHourlyData(),
			processMetricStrategyHourlyData()
		])

	const strategyAddresses = [
		...new Set(strategyData.map((data) => data.strategyAddress))
	]

	const results: HistoricalAggregateRecord[] = []
	let currentTimestamp = startTimestamp
	const offset = getOffsetInMs(frequency)

	// Process results per timestamp
	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)

		const intervalHourlyData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// Calculate metrics data for the current timestamp
		const { totalStakers: newStakers, totalAvs: newAvs } =
			await calculateMetricsForHistoricalRecord(
				intervalHourlyData,
				variant,
				totalStakers,
				undefined,
				totalAvs
			)

		totalStakers = newStakers
		totalAvs = newAvs

		let intervalStrategyData = strategyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// For each unique strategy address not present in this interval, add its latest record
		const presentAddresses = new Set(
			intervalStrategyData.map((data) => data.strategyAddress)
		)
		const missingRecords = strategyAddresses.flatMap((address) => {
			if (!presentAddresses.has(address)) {
				const latestRecord = strategyData
					.filter(
						(data) =>
							data.strategyAddress === address && data.timestamp < nextTimestamp
					)
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

				return latestRecord ? [latestRecord] : []
			}
			return []
		})
		intervalStrategyData = [...intervalStrategyData, ...missingRecords]

		// Calculate tvl data for the current timestamp
		tvlEth = calculateTvlForHistoricalRecord(
			intervalStrategyData,
			variant,
			tvlEth,
			modelNameTvl,
			ethPrices
		)
		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth,
			totalStakers,
			totalAvs
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

// --- Historical Count Routes ---

/**
 * Processes total count in historical format
 *
 * @param modelName
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalCount(
	modelName: 'avs' | 'operator' | 'staker' | 'withdrawalQueued' | 'deposit',
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const model = prisma[modelName] as any

	const startDate = resetTime(new Date(startAt))
	const endDate = resetTime(new Date(endAt))

	const getInitialTally = model.count({
		where: {
			createdAt: {
				lt: startDate
			}
		}
	})

	const getModelData = model.findMany({
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

	const [initialTally, modelData] = await Promise.all([
		getInitialTally,
		getModelData
	])

	const results: { timestamp: string; value: number }[] = []
	const offset = getOffsetInMs(frequency)

	let currentDate = startDate
	let tally = initialTally

	while (currentDate <= endDate) {
		const nextDate = new Date(currentDate.getTime() + offset)

		const intervalData = modelData.filter(
			(data: { createdAt: number }) =>
				data.createdAt >= currentDate.getTime() &&
				data.createdAt < nextDate.getTime()
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

/*
=========================
=== Utility Functions ===
=========================
*/

/**
 * Retrieves a Date object set to now or in the past basis an offset
 *
 * @param offset
 * @returns
 */
function getTimestamp(offset?: string) {
	switch (offset) {
		case '24h': {
			const now = new Date()
			return new Date(new Date().setUTCHours(now.getUTCHours() - 24))
		}
		case '7d': {
			const now = new Date()
			return new Date(new Date().setUTCDate(now.getUTCDate() - 7))
		}
		default:
			return new Date()
	}
}

/**
 * Returns offset values to calcuate consecutive timestamps in historical routes
 *
 * @param frequency
 * @returns
 */
function getOffsetInMs(frequency: string) {
	switch (frequency) {
		case '1h':
			return 3600000
		case '1d':
			return 86400000
		case '7d':
			return 604800000
		default:
			return 3600000
	}
}

/**
 * Sets any date to the beginning of the hour
 *
 * @param date
 * @returns
 */
function resetTime(date: Date) {
	date.setUTCMinutes(0, 0, 0)
	return date
}

/**
 * Fetch a map of latest LST/ETH prices
 *
 * @returns
 */
async function fetchCurrentEthPrices(): Promise<Map<string, number>> {
	const ethPrices = await fetchStrategyTokenPrices()
	const strategyPriceMap = new Map<string, number>()

	for (const [_, tokenPrice] of Object.entries(ethPrices)) {
		if (tokenPrice) {
			strategyPriceMap.set(
				tokenPrice.strategyAddress.toLowerCase(),
				tokenPrice.eth
			)
		}
	}

	strategyPriceMap.set('0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0', 1)

	return strategyPriceMap
}

/**
 * Checks if a given model name is ETH denominated
 *
 * @param value
 * @returns
 */
function checkEthDenomination(modelName: string): modelName is EthTvlModelName {
	const ethTvlModelNames: EthTvlModelName[] = [
		'metricDepositHourly',
		'metricWithdrawalHourly',
		'metricEigenPodsHourly'
	]
	return ethTvlModelNames.includes(modelName as EthTvlModelName)
}

/**
 * Calculates 24h/7d tvl change
 *
 * @param currentTvl
 * @param tvl24hOffset
 * @param tvl7dOffset
 * @returns
 */
function calculateTvlChanges(
	currentTvl: number,
	tvl24hOffset: number,
	tvl7dOffset: number
) {
	return {
		tvl: currentTvl,
		change24h: {
			value: currentTvl - tvl24hOffset,
			percent:
				tvl24hOffset === 0 ? 0 : (currentTvl - tvl24hOffset) / tvl24hOffset
		},
		change7d: {
			value: currentTvl - tvl7dOffset,
			percent: tvl7dOffset === 0 ? 0 : (currentTvl - tvl7dOffset) / tvl7dOffset
		}
	}
}

/**
 * Calculates initial tvlEth for a historical tvl query with variant set to cumulative
 *
 * @param hourlyData
 * @param ethPrices
 * @returns
 */
async function getInitialTvlCumulativeFromNative(
	hourlyData: MetricModelMap[MetricModelName][],
	ethPrices: Map<string, number>
) {
	if (!ethPrices) {
		throw new Error('ETH prices are required for for processing this data')
	}

	// Find the earliest record for each strategy
	const strategyMap = new Map<string, NativeTvlModelMap[NativeTvlModelName]>()
	for (const record of hourlyData as NativeTvlModelMap[NativeTvlModelName][]) {
		const existingRecord = strategyMap.get(record.strategyAddress)
		if (!existingRecord || record.timestamp < existingRecord.timestamp) {
			strategyMap.set(record.strategyAddress, record)
		}
	}

	let tvlEth = 0

	for (const [strategyAddress, record] of strategyMap) {
		const initialTvl = Number(record.tvl)
		const ethPrice = ethPrices?.get(strategyAddress) || 0
		tvlEth += initialTvl * ethPrice
	}

	return tvlEth
}

/**
 * Calculates tvlEth for one record of a historical tvl response
 *
 * @param intervalData
 * @param variant
 * @param previousTvl
 * @param modelName
 * @param ethPrices
 * @returns
 */
function calculateTvlForHistoricalRecord(
	intervalData: MetricModelMap[MetricModelName][],
	variant: string,
	previousTvl: number,
	modelName: MetricModelName,
	ethPrices?: Map<string, number>
): number {
	const isEthDenominated = checkEthDenomination(modelName)

	if (!isEthDenominated && !ethPrices) {
		throw new Error('ETH prices are required for processing this data')
	}

	if (variant === 'cumulative') {
		// Calculate tvlEth as the summation of tvlEth values for the latest record of each strategy
		if (intervalData.length > 0) {
			if (isEthDenominated) {
				const lastRecord = intervalData[
					intervalData.length - 1
				] as EthTvlModelMap[EthTvlModelName]
				return Number(lastRecord.tvlEth)
			}

			// Get the last records of each distinct strategy
			const lastRecordsByStrategy = new Map<
				string,
				NativeTvlModelMap[NativeTvlModelName]
			>()
			for (const record of intervalData) {
				const strategyRecord = record as NativeTvlModelMap[NativeTvlModelName]
				lastRecordsByStrategy.set(
					strategyRecord.strategyAddress,
					strategyRecord
				)
			}

			// Calculate tvl in ETH
			return Array.from(lastRecordsByStrategy.values()).reduce(
				(total, strategyRecord) => {
					return (
						total +
						Number(strategyRecord.tvl) *
							(ethPrices?.get(strategyRecord.strategyAddress) || 0)
					)
				},
				0
			)
		}

		return previousTvl // If no records exist in the time period, previous tvl value is returned
	}

	// Calculate tvlEth as the summation of all changeTvlEth
	return intervalData.reduce((sum, record) => {
		if (isEthDenominated) {
			const intervalRecord = record as EthTvlModelMap[EthTvlModelName]
			return sum + Number(intervalRecord.changeTvlEth)
		}

		const intervalRecord = record as NativeTvlModelMap[NativeTvlModelName]
		const ethPrice = ethPrices?.get(intervalRecord.strategyAddress) || 0
		return sum + Number(intervalRecord.changeTvl) * ethPrice
	}, 0)
}

/**
 * Calculates totalStakers, totalOperators/totalAvs for one record of a historical aggregate response
 *
 * @param intervalHourlyData
 * @param variant
 * @param totalStakers
 * @param totalOperators
 * @param totalAvs
 * @returns
 */
async function calculateMetricsForHistoricalRecord(
	intervalHourlyData: AggregateModelMap[AggregateModelName][],
	variant: string,
	totalStakers: number,
	totalOperators?: number,
	totalAvs?: number
) {
	let newStakers = totalStakers
	let newOperators = totalOperators || 0
	let newAvs = totalAvs || 0

	if (variant === 'cumulative') {
		// Grab metrics from the latest record
		if (intervalHourlyData.length > 0) {
			const lastRecordIndex = intervalHourlyData.length - 1

			newStakers = intervalHourlyData[lastRecordIndex].totalStakers

			newOperators =
				totalOperators !== undefined && totalOperators !== null
					? (
							intervalHourlyData[
								lastRecordIndex
							] as AggregateModelMap['metricAvsHourly']
					  ).totalOperators
					: 0

			newAvs =
				totalAvs !== undefined && totalAvs !== null
					? (
							intervalHourlyData[
								lastRecordIndex
							] as AggregateModelMap['metricOperatorHourly']
					  ).totalAvs
					: 0
		}
	} else {
		// Calculate metrics as summation of all change values
		newStakers = intervalHourlyData.reduce(
			(sum, record) => sum + record.changeStakers,
			0
		)

		newOperators =
			totalOperators !== undefined && totalOperators !== null
				? (intervalHourlyData as AggregateModelMap['metricAvsHourly'][]).reduce(
						(sum, record) => sum + record.changeOperators,
						0
				  )
				: 0

		newAvs =
			totalAvs !== undefined && totalAvs !== null
				? (
						intervalHourlyData as AggregateModelMap['metricOperatorHourly'][]
				  ).reduce((sum, record) => sum + record.changeAvs, 0)
				: 0
	}

	return {
		totalStakers: newStakers,
		totalOperators: newOperators,
		totalAvs: newAvs
	}
}
