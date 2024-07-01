import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getSharesToUnderlying, getEthPrices } from '../utils/strategies'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	baseTime,
	saveLastSyncBlock
} from '../utils/seeder'

const timeSyncKey = 'lastSyncedTime_metrics_withdrawalHourly'

export async function seedMetricsWithdrawalHourly() {
	const prismaClient = getPrismaClient()
	const withdrawalHourlyList: Omit<prisma.MetricWithdrawalHourly, 'id'>[] = []

	const startAt = await fetchLastSyncTime(timeSyncKey)
	const { timestamp: endAtTimestamp } =
		await prismaClient.viewHourlyWithdrawalData.findFirstOrThrow({
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

	// Get latest values of cumulative fields
	let { tvlEth: tvlEthDecimal, totalWithdrawals } =
		(await prismaClient.metricWithdrawalHourly.findFirst({
			select: {
				tvlEth: true,
				totalWithdrawals: true
			},
			orderBy: { timestamp: 'desc' }
		})) || { tvlEth: 0, totalWithdrawals: 0 }
	let tvlEth = tvlEthDecimal ? Number(tvlEthDecimal) : 0

	// Get logs from view
	const logs = await prismaClient.viewHourlyWithdrawalData.findMany({
		where: {
			timestamp: {
				gt: new Date(startAt),
				lte: new Date(endAt)
			}
		},
		orderBy: { timestamp: 'asc' } // Since we're calculating cumulative metrics
	})

	let currentTimestamp = logs[0].timestamp.getTime()
	let changeTvlEth = 0
	let changeWithdrawals = 0

	// Get multipliers for each strategy
	const sharesToUnderlying = await getSharesToUnderlying()
	const ethPrices = await getEthPrices()

	for (const l in logs) {
		const log = logs[l]

		const hour = log.timestamp.getTime()

		if (hour !== currentTimestamp) {
			// Completed data capture for records for a given hour
			tvlEth += changeTvlEth
			totalWithdrawals += changeWithdrawals

			withdrawalHourlyList.push({
				timestamp: new Date(currentTimestamp),
				tvlEth: new prisma.Prisma.Decimal(tvlEth),
				totalWithdrawals,
				changeTvlEth: new prisma.Prisma.Decimal(changeTvlEth),
				changeWithdrawals
			})

			// Reset for next hour
			changeTvlEth = 0
			changeWithdrawals = 0
			currentTimestamp = hour
		}

		const sharesMultiplier = Number(
			sharesToUnderlying.get(log.strategyAddress.toLowerCase())
		)
		const ethPrice = Number(ethPrices.get(log.strategyAddress.toLowerCase()))

		if (sharesMultiplier && ethPrice) {
			changeTvlEth +=
				(Number(log.totalShares) / 1e18) * sharesMultiplier * ethPrice
			changeWithdrawals += log.totalWithdrawals
		}
	}

	// Last hour
	if (changeTvlEth > 0 || changeWithdrawals > 0) {
		tvlEth += changeTvlEth
		totalWithdrawals += changeWithdrawals

		withdrawalHourlyList.push({
			timestamp: new Date(currentTimestamp),
			tvlEth: new prisma.Prisma.Decimal(tvlEth),
			totalWithdrawals,
			changeTvlEth: new prisma.Prisma.Decimal(changeTvlEth),
			changeWithdrawals
		})
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (startAt === baseTime) {
		dbTransactions.push(prismaClient.metricWithdrawalHourly.deleteMany())
	}

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
