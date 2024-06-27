import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getSharesToUnderlying, getEthPrices } from '../utils/strategies'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	saveLastSyncBlock
} from '../utils/seeder'

const timeSyncKey = 'lastSyncedTime_metrics_withdrawalHourly'

export async function seedMetricsWithdrawalHourly() {
	const prismaClient = getPrismaClient()
	const withdrawalHourlyList: Omit<prisma.MetricWithdrawalHourly, 'id'>[] = []

	const startAt = await fetchLastSyncTime(timeSyncKey)
	const { timestamp: endAtTimestamp } =
		await prismaClient.view_hourly_withdrawal_data.findFirstOrThrow({
			select: { timestamp: true },
			orderBy: { timestamp: 'desc' }
		})
	const endAt = endAtTimestamp.getTime()

	// Bail early if there is no time diff to sync
	if (endAt - startAt <= 0) {
		console.log(
			`[In Sync] [Metrics] Withdrawal Hourly from: ${new Date(
				startAt
			)} to: ${new Date(endAt)}`
		)
		return
	}

	const sharesToUnderlying = await getSharesToUnderlying()
	const ethPrices = await getEthPrices()

	const logs = await prismaClient.view_hourly_withdrawal_data.findMany({
		where: {
			timestamp: {
				gte: new Date(startAt),
				lte: new Date(endAt)
			}
		},
		orderBy: { timestamp: 'desc' }
	})

	let currentTimestamp = endAt
	let totalCount = 0
	let totalValue = 0

	for (const l in logs) {
		const log = logs[l]

		const hour = log.timestamp.getTime()

		if (hour !== currentTimestamp) {
			withdrawalHourlyList.push({
				timestamp: new Date(currentTimestamp),
				totalCount,
				totalValue: new prisma.Prisma.Decimal(totalValue)
			})

			totalCount = 0
			totalValue = 0
			currentTimestamp = hour
		}

		const sharesMultiplier = Number(
			sharesToUnderlying.get(log.strategy.toLowerCase())
		)
		const ethPrice = Number(ethPrices.get(log.strategy.toLowerCase()))

		if (sharesMultiplier && ethPrice) {
			totalCount += log.total_count
			totalValue +=
				(Number(log.total_shares) / 1e18) * sharesMultiplier * ethPrice
		}
	}

	if (totalCount > 0 || totalValue > 0) {
		withdrawalHourlyList.push({
			timestamp: new Date(currentTimestamp),
			totalCount,
			totalValue: new prisma.Prisma.Decimal(totalValue)
		})
	}

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (withdrawalHourlyList.length > 0) {
		dbTransactions.push(
			prismaClient.metricWithdrawalHourly.createMany({
				data: withdrawalHourlyList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Metrics] Withdrawal Hourly from: ${new Date(startAt)} to: ${new Date(
			endAt
		)} size: ${withdrawalHourlyList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(timeSyncKey, BigInt(endAt))
}
