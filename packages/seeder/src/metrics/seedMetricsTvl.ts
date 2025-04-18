import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	IMap,
	loopThroughDates,
	setToStartOfDay
} from '../utils/seeder'
import { getViemClient } from '../utils/viemClient'
import { strategyAbi } from '../data/abi/strategy'
import {
	getStrategiesWithShareUnderlying,
	StrategyWithShareUnderlying
} from '../utils/strategyShares'

const blockSyncKey = 'lastSyncedTimestamp_metrics_tvl'
const BATCH_DAYS = 30

type ILastStrategyMetric = Omit<prisma.MetricStrategyUnit, 'id'>
type ILastStrategyMetrics = IMap<string, ILastStrategyMetric>

export async function seedMetricsTvl(type: 'full' | 'incremental' = 'incremental') {
	const prismaClient = getPrismaClient()

	// Define start date
	let startDate: Date | null = await fetchLastSyncTime(blockSyncKey)
	const endDate: Date = new Date(new Date().setUTCHours(0, 0, 0, 0))
	let clearPrev = false

	if (type === 'full' || !startDate) {
		const firstLogTimestamp = await getFirstLogTimestamp()
		if (firstLogTimestamp) {
			startDate = new Date(new Date(firstLogTimestamp).setUTCHours(0, 0, 0, 0))
		} else {
			startDate = new Date(new Date().setUTCHours(0, 0, 0, 0))
		}
		clearPrev = true
	}

	// Bail early if there is no time diff to sync
	if (endDate.getTime() - startDate.getTime() <= 0) {
		console.log(`[In Sync] [Metrics] TVL Daily from: ${startDate} to: ${endDate}`)
		return
	}

	console.log('[Prep] Metric TVL ...')

	if (clearPrev) {
		await prismaClient.metricStrategyUnit.deleteMany()
	}

	// Get the last known metrics for eigen pods
	const lastStrategyMetrics = await getLatestMetricsPerStrategy()
	const sharesToUnderlyingMap = await getStrategiesWithShareUnderlying()

	const metrics = await processLogsInBatches(
		startDate,
		endDate,
		sharesToUnderlyingMap,
		lastStrategyMetrics
	)

	const dbTransactions = [
		prismaClient.metricStrategyUnit.createMany({
			data: metrics,
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
		`[Data] Metric TVL from: ${startDate.toISOString()} to: ${endDate.toISOString()} size: ${
			metrics.length
		}`
	)
}

async function processLogsInBatches(
	startDate: Date,
	endDate: Date,
	sharesToUnderlyingList: StrategyWithShareUnderlying[],
	lastStrategyMetrics: ILastStrategyMetrics
) {
	let metrics: ILastStrategyMetric[] = []

	for (
		let currentDate = setToStartOfDay(startDate);
		currentDate < setToStartOfDay(endDate);
		currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS)
	) {
		const batchEndDate = new Date(
			Math.min(currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS, endDate.getTime())
		)

		const blockNumbers = await getBlockNumbers(currentDate, batchEndDate)

		await loopThroughDates(
			currentDate,
			batchEndDate,
			async (fromDate, toDate) => {
				const tvlRecords = await loopTick(
					fromDate,
					toDate,
					blockNumbers,
					sharesToUnderlyingList,
					lastStrategyMetrics
				)

				metrics = [...metrics, ...tvlRecords]
			},
			'daily'
		)

		console.log(
			`[Batch] Metric TVL from: ${currentDate.toISOString()} to: ${batchEndDate.toISOString()} count: ${
				metrics.length
			}`
		)
	}

	return metrics
}

async function loopTick(
	fromDate: Date,
	toDate: Date,
	blockNumbers: { number: bigint; timestamp: Date }[],
	sharesToUnderlyingList: StrategyWithShareUnderlying[],
	lastStrategyMetrics: ILastStrategyMetrics
): Promise<ILastStrategyMetric[]> {
	const viemClient = getViemClient()
	const strategyTvlRecords: ILastStrategyMetric[] = []

	// Get current block number
	const blockNumbersInRange = blockNumbers.filter(
		(n) => n.timestamp > fromDate && n.timestamp <= toDate
	)
	const currentBlockNumber = blockNumbersInRange[blockNumbersInRange.length - 1]

	// Startegies
	const strategyAddresses = sharesToUnderlyingList.map((s) => s.strategyAddress)

	// Total shares
	const results = await Promise.allSettled(
		strategyAddresses.map(async (sa) => ({
			strategyAddress: sa,
			totalShares: await viemClient.readContract({
				address: sa as `0x${string}`,
				abi: strategyAbi,
				functionName: 'totalShares',
				blockNumber: currentBlockNumber.number
			})
		}))
	)

	for (const strategyAddress of strategyAddresses) {
		// Fetch last known metric
		const lastMetric = lastStrategyMetrics.get(strategyAddress) || {
			strategyAddress,
			tvl: new prisma.Prisma.Decimal(0),
			changeTvl: new prisma.Prisma.Decimal(0),
			timestamp: toDate
		}

		const foundStrategyIndex = results.findIndex(
			(r) =>
				r.status === 'fulfilled' &&
				r.value.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
		)

		const result = results[foundStrategyIndex]
		if (foundStrategyIndex === -1 || result.status !== 'fulfilled') continue

		const shares = result.value.totalShares as bigint
		const sharesToUnderlying = sharesToUnderlyingList.find(
			(s) => s.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
		)
		if (!sharesToUnderlying) continue

		const tvl = (Number(shares) * Number(sharesToUnderlying.sharesToUnderlying)) / 1e36

		if (tvl !== Number(lastMetric.tvl)) {
			const changeTvl = tvl - Number(lastMetric.tvl)

			const newStrategyMetric = {
				...lastMetric,
				tvl: new prisma.Prisma.Decimal(tvl),
				changeTvl: new prisma.Prisma.Decimal(changeTvl),
				timestamp: toDate
			}

			lastStrategyMetrics.set(strategyAddress, newStrategyMetric)
			strategyTvlRecords.push(newStrategyMetric)
		}
	}

	return strategyTvlRecords
}

async function getBlockNumbers(
	from: Date,
	to: Date
): Promise<{ number: bigint; timestamp: Date }[]> {
	const prismaClient = getPrismaClient()

	const blockNumbers = await prismaClient.evm_BlockData.findMany({
		where: { timestamp: { gt: from, lte: to } },
		orderBy: { timestamp: 'asc' }
	})

	return blockNumbers
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const firstLogPodDeployed = await prismaClient.eventLogs_OperatorSharesIncreased.findFirst({
		select: { blockTime: true },
		orderBy: { blockTime: 'asc' }
	})

	if (!firstLogPodDeployed) {
		return null
	}

	const firstLogPodDeployedTs = firstLogPodDeployed?.blockTime?.getTime() ?? Infinity

	return Math.min(firstLogPodDeployedTs)
}

/**
 * Get latest metrics per strategy
 *
 * @returns
 */
async function getLatestMetricsPerStrategy(): Promise<ILastStrategyMetrics> {
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerStrategy = await prismaClient.metricStrategyUnit.groupBy({
			by: ['strategyAddress'],
			_max: {
				timestamp: true
			}
		})

		const metrics = await prismaClient.metricStrategyUnit.findMany({
			where: {
				OR: lastMetricsPerStrategy.map((metric) => ({
					strategyAddress: metric.strategyAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricStrategyUnitWhereInput[]
			},
			orderBy: {
				strategyAddress: 'asc'
			}
		})

		return metrics
			? (new Map(metrics.map((metric) => [metric.strategyAddress, metric])) as ILastStrategyMetrics)
			: new Map()
	} catch {}

	return new Map()
}
