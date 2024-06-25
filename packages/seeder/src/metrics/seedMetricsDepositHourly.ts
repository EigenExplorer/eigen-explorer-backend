import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { multipliers } from '../data/constants/sharesToUnderlying'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	saveLastSyncBlock
} from '../utils/seeder'

const timeSyncKey = 'lastSyncedTime_metrics_depositHourly'

export async function seedMetricsDepositHourly() {
	const prismaClient = getPrismaClient()
	const depositHourlyList: Omit<prisma.MetricDepositHourly, 'id'>[] = []

	const firstTimestamp = await fetchLastSyncTime(timeSyncKey)
	const { hour: lastTimestamp } = (await prismaClient.hourly_deposit_data
		.findFirst({
			select: { hour: true },
			orderBy: { hour: 'desc' }
		})
		.then((result) => ({
			hour: result?.hour?.getTime() ?? 0
		}))) || { hour: 0 }

	// Bail early if there is no time diff to sync
	if (lastTimestamp - firstTimestamp <= 0) {
		console.log(
			`[In Sync] [Metrics] Deposit Hourly from: ${firstTimestamp} to: ${lastTimestamp}`
		)
		return
	}

	const logs = await prismaClient.hourly_deposit_data.findMany({
		where: {
			hour: {
				gt: new Date(firstTimestamp)
			}
		}
	})

	for (const l in logs) {
		const log = logs[l]

		const totalCount = log.total_deposits
		let totalValueInt = 0

		for (const [symbol, multiplier] of Object.entries(multipliers)) {
			const key = `sum_shares_${symbol}` as keyof typeof log
			const value = log[key]
			totalValueInt += value ? (Number(value) * multiplier) / 1e18 : 0
		}

		const totalValue = new prisma.Prisma.Decimal(totalValueInt)

		depositHourlyList.push({
			timestamp: new Date(log.hour),
			totalCount,
			totalValue
		})
	}

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (depositHourlyList.length > 0) {
		dbTransactions.push(
			prismaClient.metricDepositHourly.createMany({
				data: depositHourlyList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Metrics] Deposit Hourly from: ${firstTimestamp} to: ${lastTimestamp} size: ${depositHourlyList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(timeSyncKey, BigInt(lastTimestamp))
}
