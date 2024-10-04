import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	getSharesToUnderlying,
	getEthPrices,
	getStrategyToSymbolMap
} from '../utils/strategies'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	saveLastSyncBlock
} from '../utils/seeder'

const timeSyncKey = 'lastSyncedTime_metrics_withdrawal'

export async function seedMetricsWithdrawal() {
	const prismaClient = getPrismaClient()
	const withdrawalList: Omit<prisma.MetricWithdrawalUnit, 'id'>[] = []
	let clearPrev = false

	// Get appropriate startAt
	let startAt = Number(await fetchLastSyncTime(timeSyncKey))
	if (!startAt) {
		const firstLogTimestamp = await getFirstLogTimestamp()
		startAt = firstLogTimestamp
			? firstLogTimestamp.getTime()
			: new Date().getTime()
		clearPrev = true
	}

	// Get appropriate endAt
	const { timestamp: endAtTimestamp } =
		await prismaClient.viewHourlyWithdrawalData.findFirstOrThrow({
			select: { timestamp: true },
			orderBy: { timestamp: 'desc' }
		})
	const endAt = endAtTimestamp.getTime()

	// Bail early if there is no time diff to sync
	if (endAt - startAt <= 0) {
		console.log(
			`[In Sync] [Metrics] Withdrawal Hourly from: ${startAt} to: ${endAt}`
		)
		return
	}

	// Get latest values of cumulative fields
	let { tvlEth: tvlEthDecimal, totalWithdrawals } =
		(await prismaClient.metricWithdrawalUnit.findFirst({
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

	// Get strategy and price data
	const strategyToSymbolMap = await getStrategyToSymbolMap()
	const sharesToUnderlying = await getSharesToUnderlying()
	const ethPriceData = await getEthPrices(currentTimestamp)

	for (const l in logs) {
		const log = logs[l]

		const symbol = strategyToSymbolMap.get(log.strategyAddress)?.toLowerCase()
		const hour = log.timestamp.getTime()

		if (hour !== currentTimestamp) {
			// Completed data capture for records for a given hour
			tvlEth += changeTvlEth
			totalWithdrawals += changeWithdrawals

			withdrawalList.push({
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

		const ethPrice =
			Number(
				ethPriceData.find(
					(price) =>
						price.symbol.toLowerCase() === symbol &&
						price.timestamp.getTime() <= currentTimestamp
				)?.ethPrice
			) || 1

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

		withdrawalList.push({
			timestamp: new Date(currentTimestamp),
			tvlEth: new prisma.Prisma.Decimal(tvlEth),
			totalWithdrawals,
			changeTvlEth: new prisma.Prisma.Decimal(changeTvlEth),
			changeWithdrawals
		})
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (clearPrev) {
		dbTransactions.push(prismaClient.metricWithdrawalUnit.deleteMany())
	}

	if (withdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.metricWithdrawalUnit.createMany({
				data: withdrawalList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Metrics] Withdrawal Hourly from: ${startAt} to: ${endAt} size: ${withdrawalList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(timeSyncKey, BigInt(endAt))
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const firstLog = await prismaClient.withdrawalCompleted.findFirst({
		select: { createdAt: true },
		where: { receiveAsTokens: true },
		orderBy: { createdAt: 'asc' }
	})

	return firstLog ? firstLog.createdAt : null
}
