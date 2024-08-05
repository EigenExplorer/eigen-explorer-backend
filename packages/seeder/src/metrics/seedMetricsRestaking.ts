import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getEthPrices, getStrategyToSymbolMap } from '../utils/strategies'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	IMap,
	loopThroughDates
} from '../utils/seeder'

const blockSyncKey = 'lastSyncedTimestamp_metrics_restakingHourly'
const BATCH_DAYS = 10

// Define the type for our log entries
type ILastOperatorMetric = Omit<prisma.MetricOperatorHourly, 'id'>
type ILastOperatorStrategyMetric = Omit<
	prisma.MetricOperatorStrategyHourly,
	'id'
>
type ILastStrategyMetric = Omit<prisma.MetricStrategyHourly, 'id'>
type ILastOperatorMetrics = IMap<string, ILastOperatorMetric>
type ILastOperatorStrategyMetrics = IMap<
	string,
	IMap<string, ILastOperatorStrategyMetric>
>
type ILastStrategyMetrics = IMap<string, ILastStrategyMetric>
type LogEntry = {
	blockTime: Date
	blockNumber: bigint
	transactionIndex: number
	type: string

	operator: string
	strategy: string
	shares: string
}

export async function seedMetricsRestakingHourly() {
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
	const [
		lastOperatorMetrics,
		lastOperatorStrategyMetrics,
		lastStrategyMetrics
	] = await Promise.all([
		getLatestMetricsPerOperator(),
		getLatestMetricsPerOperatorStrategy(),
		getLatestMetricsPerStrategy()
	])

	console.log('[Prep] Metric Restaking ...')

	// Process logs in batches
	const [
		hourlyOperatorMetrics,
		hourlyOperatorStrategyMetrics,
		hourlyStrategyMetrics
	] = await processLogsInBatches(
		startDate,
		endDate,
		lastOperatorMetrics,
		lastOperatorStrategyMetrics,
		lastStrategyMetrics,
		sharesToUnderlyingList
	)

	// Update data
	const dbTransactions = [
		prismaClient.metricOperatorHourly.createMany({
			data: hourlyOperatorMetrics,
			skipDuplicates: true
		}),

		prismaClient.metricOperatorStrategyHourly.createMany({
			data: hourlyOperatorStrategyMetrics,
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
		`[Metrics] Metric Restaking from: ${startDate.toISOString()} to: ${endDate.toISOString()} size: ${
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
 * @param lastOperatorStrategyMetrics
 * @param lastStrategyMetrics
 * @param sharesToUnderlyingList
 * @returns
 */
async function processLogsInBatches(
	startDate: Date,
	endDate: Date,
	lastOperatorMetrics: ILastOperatorMetrics,
	lastOperatorStrategyMetrics: ILastOperatorStrategyMetrics,
	lastStrategyMetrics: ILastStrategyMetrics,
	sharesToUnderlyingList: { sharesToUnderlying: string; address: string }[]
): Promise<
	[ILastOperatorMetric[], ILastOperatorStrategyMetric[], ILastStrategyMetric[]]
> {
	const hourlyOperatorMetrics: ILastOperatorMetric[] = []
	const hourlyOperatorStrategyMetrics: ILastOperatorStrategyMetric[] = []
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

		await loopThroughDates(
			currentDate,
			batchEndDate,
			async (fromHour, toHour) => {
				const [
					hourlyOperatorTvlRecords,
					hourlyOperatorStrategyRecords,
					hourlyStrategyTvlRecords
				] = await hourlyLoopTick(
					fromHour,
					toHour,
					batchLogs,
					lastOperatorMetrics,
					lastOperatorStrategyMetrics,
					lastStrategyMetrics,
					sharesToUnderlyingMap
				)

				hourlyOperatorMetrics.push(...hourlyOperatorTvlRecords)
				hourlyOperatorStrategyMetrics.push(...hourlyOperatorStrategyRecords)
				hourlyStrategyMetrics.push(...hourlyStrategyTvlRecords)
			},
			'hourly'
		)

		console.log(
			`[Batch] Metric Restaking from: ${currentDate.toISOString()} to: ${batchEndDate.toISOString()} count: ${
				hourlyOperatorMetrics.length + hourlyStrategyMetrics.length
			}`
		)
	}

	return [
		hourlyOperatorMetrics,
		hourlyOperatorStrategyMetrics,
		hourlyStrategyMetrics
	]
}

/**
 * Function to record hourly tvl data
 *
 * @param fromHour
 * @param toHour
 * @param orderedLogs
 * @param lastOperatorMetrics
 * @param lastOperatorStrategyMetrics
 * @param lastStrategyMetrics
 * @param sharesToUnderlyingMap
 * @returns
 */
async function hourlyLoopTick(
	fromHour: Date,
	toHour: Date,
	orderedLogs: LogEntry[],
	lastOperatorMetrics: ILastOperatorMetrics,
	lastOperatorStrategyMetrics: ILastOperatorStrategyMetrics,
	lastStrategyMetrics: ILastStrategyMetrics,
	sharesToUnderlyingMap: Map<string, bigint>
): Promise<
	[ILastOperatorMetric[], ILastOperatorStrategyMetric[], ILastStrategyMetric[]]
> {
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
	const operatorStrategyTvlRecords: ILastOperatorStrategyMetric[] = []

	for (const strategyAddress of strategyAddresses) {
		// Fetch last known metric
		const lastMetric = lastStrategyMetrics.get(strategyAddress) || {
			strategyAddress,
			tvl: new prisma.Prisma.Decimal(0),
			changeTvl: new prisma.Prisma.Decimal(0),
			timestamp: toHour
		}

		const shares = strategyShares.get(strategyAddress) || 0n
		const sharesToUnderlying = sharesToUnderlyingMap.get(strategyAddress)
		if (!sharesToUnderlying) continue

		const changeTvl = Number(shares * sharesToUnderlying) / 1e36
		const newStrategyMetric = {
			...lastMetric,
			tvl: new prisma.Prisma.Decimal(Number(lastMetric.tvl) + changeTvl),
			changeTvl: new prisma.Prisma.Decimal(changeTvl),
			timestamp: toHour
		}

		lastStrategyMetrics.set(strategyAddress, newStrategyMetric)
		strategyTvlRecords.push(newStrategyMetric)
	}

	for (const operatorAddress of operatorAddresses) {
		// Fetch last known metric
		const lastMetric = lastOperatorMetrics.get(operatorAddress) || {
			operatorAddress,
			totalStakers: 0,
			changeStakers: 0,
			totalAvs: 0,
			changeAvs: 0,
			timestamp: toHour
		}

		// Update TVL Change
		const strategyMap = operatorStrategyShares.get(operatorAddress)
		if (!strategyMap) continue

		for (const [strategyAddress, shares] of strategyMap) {
			let changeTvl = 0

			const sharesToUnderlying = sharesToUnderlyingMap.get(strategyAddress)
			if (sharesToUnderlying) {
				changeTvl += Number(shares * sharesToUnderlying) / 1e36
			}

			if (!lastOperatorStrategyMetrics.has(operatorAddress)) {
				lastOperatorStrategyMetrics.set(operatorAddress, new Map())
			}

			const lastOperatorStrategyMetric = lastOperatorStrategyMetrics
				.get(operatorAddress)
				.get(strategyAddress) || {
				operatorAddress,
				strategyAddress,
				tvl: new prisma.Prisma.Decimal(0),
				changeTvl: new prisma.Prisma.Decimal(0),
				timestamp: toHour
			}

			// TODO: DO SOMETHING HERE
			const newOperatorStrategyMetric = {
				...lastOperatorStrategyMetric,
				tvl: new prisma.Prisma.Decimal(
					Number(lastOperatorStrategyMetric.tvl) + changeTvl
				),
				changeTvl: new prisma.Prisma.Decimal(changeTvl),
				timestamp: toHour
			}

			lastOperatorStrategyMetrics
				.get(operatorAddress)
				.set(strategyAddress, newOperatorStrategyMetric)

			operatorStrategyTvlRecords.push(newOperatorStrategyMetric)
		}

		// Update Staker Change
		const changeStakers = operatorStakers.get(operatorAddress) || 0

		const newOperatorMetric = {
			...lastMetric,
			totalStakers: lastMetric.totalStakers + changeStakers,
			changeStakers,
			totalAvs: 0,
			changeAvs: 0,
			timestamp: toHour
		}

		lastOperatorMetrics.set(operatorAddress, newOperatorMetric)
		operatorTvlRecords.push(newOperatorMetric)
	}

	return [operatorTvlRecords, operatorStrategyTvlRecords, strategyTvlRecords]
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
 * Get latest metrics per operator strategy
 *
 * @returns
 */
async function getLatestMetricsPerOperatorStrategy(): Promise<ILastOperatorStrategyMetrics> {
	const groupedMetrics: ILastOperatorStrategyMetrics = new Map()
	const prismaClinet = getPrismaClient()

	try {
		const lastMetricsPerOperatorStrategy =
			await prismaClinet.metricOperatorStrategyHourly.groupBy({
				by: ['operatorAddress', 'strategyAddress'],
				_max: {
					timestamp: true
				}
			})

		const metrics = await prismaClinet.metricOperatorStrategyHourly.findMany({
			where: {
				OR: lastMetricsPerOperatorStrategy.map((metric) => ({
					operatorAddress: metric.operatorAddress,
					strategyAddress: metric.strategyAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricOperatorStrategyHourlyWhereInput[]
			},
			orderBy: {
				operatorAddress: 'asc'
			}
		})

		for (const metric of metrics) {
			const { operatorAddress, strategyAddress } = metric

			if (!groupedMetrics.has(operatorAddress)) {
				groupedMetrics.set(operatorAddress, new Map())
			}

			const operatorMetrics = groupedMetrics.get(operatorAddress)

			const metricWithoutId: ILastOperatorStrategyMetric = {
				operatorAddress: metric.operatorAddress,
				strategyAddress: metric.strategyAddress,
				tvl: metric.tvl,
				changeTvl: metric.changeTvl,
				timestamp: metric.timestamp
			}

			operatorMetrics.set(strategyAddress, metricWithoutId)
		}
	} catch {}

	return groupedMetrics
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
