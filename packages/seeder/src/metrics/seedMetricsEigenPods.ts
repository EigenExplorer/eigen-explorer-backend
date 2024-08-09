import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	loopThroughDates
} from '../utils/seeder'
import { dateToEpoch } from '../utils/beaconChain'

const blockSyncKey = 'lastSyncedTimestamp_metrics_eigenPodsHourly'
const BATCH_DAYS = 10

// Define the type for our log entries
type LastMetricEigenPodsHourly = Omit<prisma.MetricEigenPodsHourly, 'id'>
type LogEntry = {
	blockTime: Date
	eigenPod: string
	blockNumber: bigint
	transactionIndex: number
	type: string
}

export async function seedMetricsEigenPodsHourly() {
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
	const lastEigenPodsMetric = await getLatestMetrics()

	console.log('[Prep] Metric EigenPods ...')

	const hourlyMetrics = await processLogsInBatches(
		startDate,
		endDate,
		lastEigenPodsMetric
	)

	const dbTransactions = [
		prismaClient.metricEigenPodsHourly.createMany({
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
		`[Data] Metric EigenPods from: ${startDate.toISOString()} to: ${endDate.toISOString()} size: ${
			hourlyMetrics.length
		}`
	)
}

async function processLogsInBatches(
	startDate: Date,
	endDate: Date,
	lastEigenPodsMetric: LastMetricEigenPodsHourly
) {
	let hourlyMetrics: LastMetricEigenPodsHourly[] = []

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
				const hourlyTvlRecords = await hourlyLoopTick(
					fromHour,
					toHour,
					batchLogs,
					lastEigenPodsMetric
				)

				hourlyMetrics = [...hourlyMetrics, ...hourlyTvlRecords]
			},
			'hourly'
		)

		console.log(
			`[Batch] Metric EigenPods from: ${currentDate.toISOString()} to: ${batchEndDate.toISOString()} count: ${
				hourlyMetrics.length
			}`
		)
	}

	return hourlyMetrics
}

async function hourlyLoopTick(
	fromHour: Date,
	toHour: Date,
	orderedLogs: LogEntry[],
	lastEigenPodsMetric: LastMetricEigenPodsHourly
): Promise<LastMetricEigenPodsHourly[]> {
	const prismaClient = getPrismaClient()
	const podAddresses = new Set<string>()
	const startEpoch = dateToEpoch(fromHour)
	const endEpoch = dateToEpoch(toHour)

	const hourlyLogs = orderedLogs.filter(
		(ol) => ol.blockTime > fromHour && ol.blockTime <= toHour
	)

	let tvl = 0
	let totalPods = 0
	let changePods = 0

	if (lastEigenPodsMetric) {
		tvl = Number(lastEigenPodsMetric.tvlEth)
		totalPods = lastEigenPodsMetric.totalPods
	}

	for (const ol of hourlyLogs) {
		const podAddress = ol.eigenPod.toLowerCase()
		podAddresses.add(podAddress)
	}

	// Calculate
	changePods = podAddresses.size

	if (changePods > 0) {
		const withdrawalCredentials = Array.from(podAddresses).map((address) =>
			address.replace('0x', '0x010000000000000000000000')
		)

		const [newValidators, exitedValidators] = await Promise.all([
			prismaClient.validator.count({
				where: { withdrawalCredentials: { in: withdrawalCredentials } }
			}),
			prismaClient.validator.count({
				where: { exitEpoch: { gt: startEpoch, lte: endEpoch } }
			})
		])

		const changeTvl = (newValidators - exitedValidators) * 32

		const tvlRecord = {
			timestamp: toHour,
			tvlEth: (tvl + changeTvl) as unknown as prisma.Prisma.Decimal,
			changeTvlEth: changeTvl as unknown as prisma.Prisma.Decimal,
			totalPods: totalPods + changePods,
			changePods
		}

		Object.assign(lastEigenPodsMetric, tvlRecord)

		return [tvlRecord]
	}

	return []
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const firstLogPodDeployed =
		await prismaClient.eventLogs_PodDeployed.findFirst({
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
 * Fetch ordered logs
 *
 * @param from
 * @param to
 * @returns
 */
async function fetchOrderedLogs(from: Date, to: Date): Promise<LogEntry[]> {
	const prismaClient = getPrismaClient()
	const query = { blockTime: { gt: from, lte: to } }

	const logs_podDeployed = (
		await prismaClient.eventLogs_PodDeployed.findMany({
			where: query
		})
	).map((l) => ({ ...l, type: 'PodDeployed' }))

	const orderedLogs = [...logs_podDeployed].sort((a, b) => {
		if (a.blockNumber === b.blockNumber) {
			return a.transactionIndex - b.transactionIndex
		}

		return Number(a.blockNumber - b.blockNumber)
	})

	return orderedLogs
}

/**
 * Get latest metrics
 *
 * @returns
 */
async function getLatestMetrics(): Promise<
	Omit<prisma.MetricEigenPodsHourly, 'id'>
> {
	const prismaClient = getPrismaClient()
	const lastMetric = await prismaClient.metricEigenPodsHourly.findFirst({
		orderBy: { timestamp: 'desc' }
	})

	return (
		lastMetric || {
			tvlEth: new prisma.Prisma.Decimal(0),
			changeTvlEth: new prisma.Prisma.Decimal(0),
			totalPods: 0,
			changePods: 0,
			timestamp: new Date()
		}
	)
}
