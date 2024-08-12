import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	IMap,
	loopThroughDates,
	setToStartOfHour
} from '../utils/seeder'
import { getViemClient } from '../utils/viemClient'
import { strategyAbi } from '../data/abi/strategy'
import { getEigenContracts } from '../data/address'

const blockSyncKey = 'lastSyncedTimestamp_metrics_tvlHourly'
const BATCH_DAYS = 7

type ILastStrategyMetric = Omit<prisma.MetricStrategyHourly, 'id'>
type ILastStrategyMetrics = IMap<string, ILastStrategyMetric>

export async function seedMetricsTvlHourly() {
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

	// Get the last known metrics for eigen pods
	const lastStrategyMetrics = await getLatestMetricsPerStrategy()
	const sharesToUnderlyingMap = await getStrategiesWithShareUnderlying()

	console.log('[Prep] Metric TVL ...')

	const hourlyMetrics = await processLogsInBatches(
		startDate,
		endDate,
		sharesToUnderlyingMap,
		lastStrategyMetrics
	)

	const dbTransactions = [
		prismaClient.metricStrategyHourly.createMany({
			data: hourlyMetrics,
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
			hourlyMetrics.length
		}`
	)
}

async function processLogsInBatches(
	startDate: Date,
	endDate: Date,
	sharesToUnderlyingMap: Map<string, bigint>,
	lastStrategyMetrics: ILastStrategyMetrics
) {
	let hourlyMetrics: ILastStrategyMetric[] = []

	for (
		let currentDate = setToStartOfHour(startDate);
		currentDate < setToStartOfHour(endDate);
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

		const blockNumbers = await getBlockNumbers(currentDate, batchEndDate)

		await loopThroughDates(
			currentDate,
			batchEndDate,
			async (fromHour, toHour) => {
				const hourlyTvlRecords = await hourlyLoopTick(
					fromHour,
					toHour,
					blockNumbers,
					sharesToUnderlyingMap,
					lastStrategyMetrics
				)

				hourlyMetrics = [...hourlyMetrics, ...hourlyTvlRecords]
			},
			'hourly'
		)

		console.log(
			`[Batch] Metric TVL from: ${currentDate.toISOString()} to: ${batchEndDate.toISOString()} count: ${
				hourlyMetrics.length
			}`
		)
	}

	return hourlyMetrics
}

async function hourlyLoopTick(
	fromHour: Date,
	toHour: Date,
	blockNumbers: { number: bigint; timestamp: Date }[],
	sharesToUnderlyingMap: Map<string, bigint>,
	lastStrategyMetrics: ILastStrategyMetrics
): Promise<ILastStrategyMetric[]> {
	const viemClient = getViemClient()
	const strategyTvlRecords: ILastStrategyMetric[] = []

	// Get current block number
	const blockNumbersInRange = blockNumbers.filter(
		(n) => n.timestamp > fromHour && n.timestamp <= toHour
	)
	const currentBlockNumber = blockNumbersInRange[blockNumbersInRange.length - 1]

	// Startegies
	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategyAddresses = strategyKeys.map((s) =>
		getEigenContracts().Strategies[s].strategyContract.toLowerCase()
	)

	// Total shares
	const results = await Promise.allSettled(
		strategyAddresses.map(async (sa) => ({
			strategyAddress: sa,
			totalShares: await viemClient.readContract({
				address: sa,
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
			timestamp: toHour
		}

		const foundStrategyIndex = results.findIndex(
			(r) =>
				r.status === 'fulfilled' &&
				r.value.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
		)
		if (
			foundStrategyIndex === -1 ||
			results[foundStrategyIndex].status !== 'fulfilled'
		)
			continue

		const shares = results[foundStrategyIndex].value.totalShares as bigint
		const sharesToUnderlying = sharesToUnderlyingMap.get(strategyAddress)
		if (!sharesToUnderlying) continue

		const tvl = Number(shares * sharesToUnderlying) / 1e36

		if (tvl !== Number(lastMetric.tvl)) {
			const changeTvl = tvl - Number(lastMetric.tvl)

			const newStrategyMetric = {
				...lastMetric,
				tvl: new prisma.Prisma.Decimal(tvl),
				changeTvl: new prisma.Prisma.Decimal(changeTvl),
				timestamp: toHour
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

	const firstLogPodDeployed =
		await prismaClient.eventLogs_OperatorSharesIncreased.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		})

	if (!firstLogPodDeployed) {
		return null
	}

	const firstLogPodDeployedTs =
		firstLogPodDeployed?.blockTime?.getTime() ?? Infinity

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
		const lastMetricsPerStrategy =
			await prismaClient.metricStrategyHourly.groupBy({
				by: ['strategyAddress'],
				_max: {
					timestamp: true
				}
			})

		const metrics = await prismaClient.metricStrategyHourly.findMany({
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

export async function getStrategiesWithShareUnderlying(): Promise<
	Map<string, bigint>
> {
	const prismaClient = getPrismaClient()

	const sharesToUnderlyingList = await prismaClient.strategies.findMany({
		select: { sharesToUnderlying: true, address: true }
	})

	return new Map(
		sharesToUnderlyingList.map((s) => [s.address, BigInt(s.sharesToUnderlying)])
	)
}
