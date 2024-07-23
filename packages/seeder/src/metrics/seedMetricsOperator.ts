import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getEthPrices, getStrategyToSymbolMap } from '../utils/strategies'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	IMap,
	loopThroughDates
} from '../utils/seeder'

const blockSyncKey = 'lastSyncedTimestamp_metrics_operatorHourly'
const BATCH_DAYS = 30

// Define the type for our log entries
type ILastOperatorMetric = Omit<prisma.MetricOperatorHourly, 'id'>
type ILastStrategyMetric = Omit<prisma.MetricStrategyHourly, 'id'>
type ILastOperatorMetrics = IMap<
	string,
	Omit<prisma.MetricOperatorHourly, 'id'>
>
type ILastStrategyMetrics = IMap<
	string,
	Omit<prisma.MetricStrategyHourly, 'id'>
>
type LogEntry = {
	blockTime: Date
	blockNumber: bigint
	transactionIndex: number
	type: string

	operator: string
	strategy: string
	shares: string
}

export async function seedMetricsOperatorHourly() {
	const prismaClient = getPrismaClient()

	// Define start date
	let startDate: Date | null = await fetchLastSyncTime(blockSyncKey)
	const endDate: Date = new Date()

	if (!startDate) {
		const firstLogTimestamp = await getFirstLogTimestamp()
		if (firstLogTimestamp) {
			startDate = new Date(firstLogTimestamp)
		} else {
			startDate = new Date()
		}
	}

	// Fetch constant data
	const [sharesToUnderlyingList, ethPriceData, strategyToSymbolMap] =
		await Promise.all([
			prismaClient.strategies.findMany({
				select: { sharesToUnderlying: true, address: true }
			}),
			getEthPrices(startDate.getTime()),
			getStrategyToSymbolMap()
		])

	// Fetch last metrics
	const [lastOperatorMetrics, lastStrategyMetrics] = await Promise.all([
		getLatestMetricsPerOperator(),
		getLatestMetricsPerStrategy()
	])

	// Process logs in batches
	const [hourlyOperatorMetrics, hourlyStrategyMetrics] =
		await processLogsInBatches(
			startDate,
			endDate,
			lastOperatorMetrics,
			lastStrategyMetrics,
			sharesToUnderlyingList,
			strategyToSymbolMap,
			ethPriceData
		)

	// Update data
	const dbTransactions = [
		prismaClient.metricOperatorHourly.createMany({
			data: hourlyOperatorMetrics,
			skipDuplicates: true
		}),

		prismaClient.metricStrategyHourly.createMany({
			data: hourlyStrategyMetrics,
			skipDuplicates: true
		}),

		prismaClient.settings.upsert({
			where: { key: blockSyncKey },
			update: { value: Number(endDate.getTime()) },
			create: { key: blockSyncKey, value: Number(endDate.getTime()) }
		})
	]

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Metrics] Metric Operator & Strategy from: ${startDate.getTime()} to: ${endDate.getTime()} size: ${
			hourlyOperatorMetrics.length
		} ${hourlyStrategyMetrics.length}`
	)
}

/**
 * Process logs in batches
 *
 * @param startDate
 * @param endDate
 * @param lastOperatorMetrics
 * @param lastStrategyMetrics
 * @param sharesToUnderlyingList
 * @param strategyToSymbolMap
 * @param ethPriceData
 * @returns
 */
async function processLogsInBatches(
	startDate: Date,
	endDate: Date,
	lastOperatorMetrics: ILastOperatorMetrics,
	lastStrategyMetrics: ILastStrategyMetrics,
	sharesToUnderlyingList: { sharesToUnderlying: string; address: string }[],
	strategyToSymbolMap: Map<string, string>,
	ethPriceData: {
		symbol: string
		timestamp: Date
		ethPrice: prisma.Prisma.Decimal
	}[]
): Promise<[ILastOperatorMetric[], ILastStrategyMetric[]]> {
	const hourlyOperatorMetrics: ILastOperatorMetric[] = []
	const hourlyStrategyMetrics: ILastStrategyMetric[] = []
	const sharesToUnderlyingMap = new Map(
		sharesToUnderlyingList.map((s) => [s.address, BigInt(s.sharesToUnderlying)])
	)

	for (
		let currentDate = new Date(startDate);
		currentDate < endDate;
		currentDate = new Date(
			currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS
		)
	) {
		const batchEndDate = new Date(
			Math.min(
				currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS,
				endDate.getTime()
			)
		)
		const batchLogs = await fetchOrderedLogs(currentDate, batchEndDate)

		console.log('Log batch', currentDate, batchEndDate, batchLogs.length)

		await loopThroughDates(
			currentDate,
			batchEndDate,
			async (fromHour, toHour) => {
				const [hourlyOperatorTvlRecords, hourlyStrategyTvlRecords] =
					await hourlyLoopTick(
						fromHour,
						toHour,
						batchLogs,
						lastOperatorMetrics,
						lastStrategyMetrics,
						sharesToUnderlyingMap,
						strategyToSymbolMap,
						ethPriceData
					)

				hourlyOperatorMetrics.push(...hourlyOperatorTvlRecords)
				hourlyStrategyMetrics.push(...hourlyStrategyTvlRecords)
			},
			'hourly'
		)
	}

	return [hourlyOperatorMetrics, hourlyStrategyMetrics]
}

/**
 * Function to record hourly tvl data
 *
 * @param fromHour
 * @param toHour
 * @param orderedLogs
 * @param lastOperatorMetrics
 * @param lastStrategyMetrics
 * @param sharesToUnderlyingMap
 * @param strategyToSymbolMap
 * @param ethPriceData
 * @returns
 */
async function hourlyLoopTick(
	fromHour: Date,
	toHour: Date,
	orderedLogs: LogEntry[],
	lastOperatorMetrics: Map<string, ILastOperatorMetric>,
	lastStrategyMetrics: Map<string, ILastStrategyMetric>,
	sharesToUnderlyingMap: Map<string, bigint>,
	strategyToSymbolMap: Map<string, string>,
	ethPriceData: {
		symbol: string
		timestamp: Date
		ethPrice: prisma.Prisma.Decimal
	}[]
): Promise<[ILastOperatorMetric[], ILastStrategyMetric[]]> {
	const operatorAddresses = new Set<string>()
	const strategyAddresses = new Set<string>()
	const operatorStakers = new Map<string, number>()
	const operatorStrategyShares = new Map<string, Map<string, bigint>>()
	const strategyShares = new Map<string, bigint>()

	const hourlyLogs = orderedLogs.filter(
		(ol) => ol.blockTime > fromHour && ol.blockTime <= toHour
	)

	for (const ol of hourlyLogs) {
		const operatorAddress = ol.operator.toLowerCase()
		operatorAddresses.add(operatorAddress)

		if (
			ol.type === 'OperatorSharesIncreased' ||
			ol.type === 'OperatorSharesDecreased'
		) {
			const shares = BigInt(ol.shares)
			const strategyAddress = ol.strategy.toLowerCase()
			strategyAddresses.add(strategyAddress)

			const operatorShares =
				operatorStrategyShares.get(operatorAddress) || new Map()
			operatorStrategyShares.set(operatorAddress, operatorShares)

			const currentShares = operatorShares.get(strategyAddress) || 0n
			const newShares =
				ol.type === 'OperatorSharesIncreased'
					? currentShares + shares
					: currentShares - shares
			operatorShares.set(strategyAddress, newShares)

			const currentStrategyShares = strategyShares.get(strategyAddress) || 0n
			strategyShares.set(
				strategyAddress,
				ol.type === 'OperatorSharesIncreased'
					? currentStrategyShares + shares
					: currentStrategyShares - shares
			)
		} else if (
			ol.type === 'StakerDelegated' ||
			ol.type === 'StakerUndelegated'
		) {
			const currentStakers = operatorStakers.get(operatorAddress) || 0
			operatorStakers.set(
				operatorAddress,
				ol.type === 'StakerDelegated' ? currentStakers + 1 : currentStakers - 1
			)
		}
	}

	const strategyTvlRecords: ILastStrategyMetric[] = []
	const operatorTvlRecords: ILastOperatorMetric[] = []

	for (const strategyAddress of strategyAddresses) {
		const lastMetric = lastStrategyMetrics.get(strategyAddress) || {
			strategyAddress,
			tvl: new prisma.Prisma.Decimal(0),
			tvlEth: new prisma.Prisma.Decimal(0),
			changeTvl: new prisma.Prisma.Decimal(0),
			changeTvlEth: new prisma.Prisma.Decimal(0),
			timestamp: toHour
		}

		const shares = strategyShares.get(strategyAddress) || 0n
		const sharesToUnderlying = sharesToUnderlyingMap.get(strategyAddress)

		if (sharesToUnderlying) {
			const symbol = strategyToSymbolMap.get(strategyAddress)?.toLowerCase()
			const ethPrice = getLatestEthPrice(ethPriceData, symbol, toHour) || 1

			const changeTvl = Number(shares * sharesToUnderlying) / 1e36
			const changeTvlEth = changeTvl * ethPrice

			const newMetric = {
				...lastMetric,
				tvl: new prisma.Prisma.Decimal(Number(lastMetric.tvl) + changeTvl),
				tvlEth: new prisma.Prisma.Decimal(
					Number(lastMetric.tvlEth) + changeTvlEth
				),
				changeTvl: new prisma.Prisma.Decimal(changeTvl),
				changeTvlEth: new prisma.Prisma.Decimal(changeTvlEth),
				timestamp: toHour
			}

			lastStrategyMetrics.set(strategyAddress, newMetric)
			strategyTvlRecords.push(newMetric)
		}
	}

	for (const operatorAddress of operatorAddresses) {
		const lastMetric = lastOperatorMetrics.get(operatorAddress) || {
			operatorAddress,
			tvlEth: new prisma.Prisma.Decimal(0),
			totalStakers: 0,
			changeTvlEth: new prisma.Prisma.Decimal(0),
			changeStakers: 0,
			timestamp: toHour
		}

		let changeTvlEth = 0
		const strategyMap = operatorStrategyShares.get(operatorAddress)
		if (strategyMap) {
			for (const [strategyAddress, shares] of strategyMap) {
				const sharesToUnderlying = sharesToUnderlyingMap.get(strategyAddress)
				if (sharesToUnderlying) {
					const symbol = strategyToSymbolMap.get(strategyAddress)?.toLowerCase()
					const ethPrice = getLatestEthPrice(ethPriceData, symbol, toHour) || 1

					changeTvlEth +=
						(Number(shares * sharesToUnderlying) / 1e36) * ethPrice
				}
			}
		}

		const changeStakers = operatorStakers.get(operatorAddress) || 0

		const newMetric = {
			...lastMetric,
			tvlEth: new prisma.Prisma.Decimal(
				Number(lastMetric.tvlEth) + changeTvlEth
			),
			changeTvlEth: new prisma.Prisma.Decimal(changeTvlEth),
			totalStakers: lastMetric.totalStakers + changeStakers,
			changeStakers,
			timestamp: toHour
		}

		lastOperatorMetrics.set(operatorAddress, newMetric)
		operatorTvlRecords.push(newMetric)
	}

	return [operatorTvlRecords, strategyTvlRecords]
}

/**
 * Fetch eth prices
 *
 * @param ethPriceData
 * @param symbol
 * @param toHour
 * @returns
 */
function getLatestEthPrice(
	ethPriceData: {
		symbol: string
		timestamp: Date
		ethPrice: prisma.Prisma.Decimal
	}[],
	symbol: string | undefined,
	toHour: Date
): number {
	return (
		Number(
			ethPriceData
				.filter(
					(price) =>
						price.symbol.toLowerCase() === symbol &&
						price.timestamp.getTime() <= toHour.getTime()
				)
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
				?.ethPrice
		) || 1
	)
}

/**
 * Fetch ordered logs
 *
 * @param from
 * @param to
 * @returns
 */
async function fetchOrderedLogs(from: Date, to: Date): Promise<LogEntry[]> {
	const prismaClient = getPrismaClient()
	const query = { blockTime: { gt: from, lte: to } }

	const [logs_osInc, logs_osDec, logs_stakersInc, logs_stakersDec] =
		await Promise.all([
			prismaClient.eventLogs_OperatorSharesIncreased.findMany({ where: query }),
			prismaClient.eventLogs_OperatorSharesDecreased.findMany({ where: query }),
			prismaClient.eventLogs_StakerDelegated.findMany({ where: query }),
			prismaClient.eventLogs_StakerUndelegated.findMany({ where: query })
		])

	const orderedLogs = [
		...logs_osInc.map((l) => ({ ...l, type: 'OperatorSharesIncreased' })),
		...logs_osDec.map((l) => ({ ...l, type: 'OperatorSharesDecreased' })),
		...logs_stakersInc.map((l) => ({ ...l, type: 'StakerDelegated' })),
		...logs_stakersDec.map((l) => ({ ...l, type: 'StakerUndelegated' }))
	].sort(
		(a, b) =>
			Number(a.blockNumber - b.blockNumber) ||
			a.transactionIndex - b.transactionIndex
	)

	return orderedLogs as unknown as LogEntry[]
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const [firstLogOsInc, firstLogOsDec, firstLogStakerInc, firstLogStakerDec] =
		await Promise.all([
			prismaClient.eventLogs_OperatorSharesIncreased.findFirst({
				select: { blockTime: true },
				orderBy: { blockTime: 'asc' }
			}),
			prismaClient.eventLogs_OperatorSharesDecreased.findFirst({
				select: { blockTime: true },
				orderBy: { blockTime: 'asc' }
			}),
			prismaClient.eventLogs_StakerDelegated.findFirst({
				select: { blockTime: true },
				orderBy: { blockTime: 'asc' }
			}),
			prismaClient.eventLogs_StakerUndelegated.findFirst({
				select: { blockTime: true },
				orderBy: { blockTime: 'asc' }
			})
		])

	const timestamps = [
		firstLogOsInc?.blockTime,
		firstLogOsDec?.blockTime,
		firstLogStakerInc?.blockTime,
		firstLogStakerDec?.blockTime
	].filter(
		(timestamp): timestamp is Date =>
			timestamp !== null && timestamp !== undefined
	)

	return timestamps.length > 0
		? new Date(Math.min(...timestamps.map((t) => t.getTime())))
		: null
}

/**
 * Get latest metrics per operator
 *
 * @returns
 */
async function getLatestMetricsPerOperator(): Promise<ILastOperatorMetrics> {
	const prismaClinet = getPrismaClient()

	try {
		const lastMetricsPerStrategy =
			await prismaClinet.metricOperatorHourly.groupBy({
				by: ['operatorAddress'],
				_max: {
					timestamp: true
				}
			})

		const metrics = await prismaClinet.metricOperatorHourly.findMany({
			where: {
				OR: lastMetricsPerStrategy.map((metric) => ({
					operatorAddress: metric.operatorAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricOperatorHourlyWhereInput[]
			},
			orderBy: {
				operatorAddress: 'asc'
			}
		})

		return metrics
			? new Map(metrics.map((metric) => [metric.operatorAddress, metric]))
			: new Map()
	} catch {}

	return new Map()
}

/**
 * Get latest metrics per strategy
 *
 * @returns
 */
async function getLatestMetricsPerStrategy(): Promise<ILastStrategyMetrics> {
	const prismaClinet = getPrismaClient()

	try {
		const lastMetricsPerStrategy =
			await prismaClinet.metricStrategyHourly.groupBy({
				by: ['strategyAddress'],
				_max: {
					timestamp: true
				}
			})

		const metrics = await prismaClinet.metricStrategyHourly.findMany({
			where: {
				OR: lastMetricsPerStrategy.map((metric) => ({
					strategyAddress: metric.strategyAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricStrategyHourlyWhereInput[]
			},
			orderBy: {
				strategyAddress: 'asc'
			}
		})

		return metrics
			? new Map(metrics.map((metric) => [metric.strategyAddress, metric]))
			: new Map()
	} catch {}

	return new Map()
}
