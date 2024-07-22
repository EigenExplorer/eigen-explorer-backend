import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	loopThroughDates
} from '../utils/seeder'
import { dateToEpoch } from '../utils/beaconChain'

const blockSyncKey = 'lastSyncedTimestamp_metrics_eigenPodsHourly'

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
	let lastEigenPodsMetric = await getLatestMetrics()

	// Check date diff
	const frequency: 'daily' | 'hourly' = 'daily'

	// Loop through a daily
	await loopThroughDates(
		startDate,
		endDate,
		async (from: Date, to: Date) => {
			const orderedLogs = await fetchOrderedLogs(from, to)

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			let tvlRecords: any[] = []

			if (frequency === 'daily') {
				await loopThroughDates(
					from,
					to,
					async (fromHour, toHour) => {
						const hourlyTvlRecords = await hourlyLoopTick(
							fromHour,
							toHour,
							orderedLogs
						)

						tvlRecords = [...tvlRecords, ...hourlyTvlRecords]
					},
					'hourly'
				)
			} else {
				const hourlyTvlRecords = await hourlyLoopTick(from, to, orderedLogs)

				tvlRecords = [...tvlRecords, ...hourlyTvlRecords]
			}

			// Push updates
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			dbTransactions.push(
				prismaClient.metricEigenPodsHourly.createMany({
					data: tvlRecords,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.settings.upsert({
					where: { key: blockSyncKey },
					update: { value: Number(to.getTime()) },
					create: { key: blockSyncKey, value: Number(to.getTime()) }
				})
			)

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Data] EigenPods metric from: ${from.getTime()} to: ${to.getTime()} size: ${
					tvlRecords.length
				}`
			)
		},
		frequency
	)

	async function hourlyLoopTick(fromHour: Date, toHour: Date, orderedLogs) {
		const prismaClient = getPrismaClient()
		const podAddresses = new Set<string>()
		const startEpoch = dateToEpoch(fromHour)
		const endEpoch = dateToEpoch(toHour)

		const hourlyLogs = orderedLogs.filter(
			(ol) => ol.blockTime > fromHour && ol.blockTime <= toHour
		)

		let tvlEth = 0
		let changeTvlEth = 0
		let totalPods = 0
		let changePods = 0

		if (!lastEigenPodsMetric) {
			lastEigenPodsMetric = {
				tvlEth: new prisma.Prisma.Decimal(0),
				changeTvlEth: new prisma.Prisma.Decimal(0),
				totalPods: 0,
				changePods: 0,
				timestamp: toHour
			}
		} else {
			tvlEth = Number(lastEigenPodsMetric.tvlEth)
			totalPods = lastEigenPodsMetric.totalPods
		}

		for (const ol of hourlyLogs) {
			const podAddress = ol.eigenPod.toLowerCase()
			podAddresses.add(podAddress)
		}

		// Calculate
		changePods = podAddresses.size

		if (changePods > 0) {
			const withdrawalCredentials: string[] = []

			for (const address of podAddresses) {
				withdrawalCredentials.push(
					address.replace('0x', '0x010000000000000000000000')
				)
			}

			const newValidators = await prismaClient.validator.count({
				where: {
					withdrawalCredentials: { in: withdrawalCredentials }
				}
			})

			const exitedValidators = await prismaClient.validator.count({
				where: { exitEpoch: { gt: startEpoch, lte: endEpoch } }
			})

			changeTvlEth = (newValidators - exitedValidators) * 32

			console.log(
				'Validators count new/exited',
				String(newValidators),
				String(exitedValidators),
				new Date(toHour)
			)

			// Update
			lastEigenPodsMetric = {
				timestamp: toHour,
				tvlEth: (tvlEth + changeTvlEth) as unknown as prisma.Prisma.Decimal,
				changeTvlEth: changeTvlEth as unknown as prisma.Prisma.Decimal,
				totalPods: totalPods + changePods,
				changePods
			}

			return [
				{
					timestamp: toHour,
					tvlEth: tvlEth + changeTvlEth,
					changeTvlEth,
					totalPods: totalPods + changePods,
					changePods
				}
			]
		}

		return []
	}
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
async function fetchOrderedLogs(from: Date, to: Date) {
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
async function getLatestMetrics(): Promise<Omit<
	prisma.MetricEigenPodsHourly,
	'id'
> | null> {
	const prismaClient = getPrismaClient()

	try {
		const lastEigenPodsMetric =
			await prismaClient.metricEigenPodsHourly.findFirst({
				orderBy: { timestamp: 'desc' }
			})

		return lastEigenPodsMetric
	} catch {}

	return null
}
