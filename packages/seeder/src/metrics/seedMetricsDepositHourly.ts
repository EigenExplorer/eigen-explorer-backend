import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getSharesToUnderlying, getEthPrices } from '../utils/strategies'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	baseTime,
	saveLastSyncBlock
} from '../utils/seeder'

const timeSyncKey = 'lastSyncedTime_metrics_depositHourly'

export async function seedMetricsDepositHourly() {
	const prismaClient = getPrismaClient()
	const depositHourlyList: Omit<prisma.MetricDepositHourly, 'id'>[] = []

	let startAt = await fetchLastSyncTime(timeSyncKey)

	// TODO: Get appropirate start at time
	if (!startAt) {
		startAt = new Date(baseTime)
	}

	const { timestamp: endAtTimestamp } =
		await prismaClient.viewHourlyDepositData.findFirstOrThrow({
			select: { timestamp: true },
			orderBy: { timestamp: 'desc' }
		})
	const endAt = endAtTimestamp.getTime()

	// Bail early if there is no time diff to sync
	if (endAt - startAt.getTime() <= 0) {
		console.log(
			`[In Sync] [Metrics] Deposit Hourly from: ${startAt} to: ${new Date(
				endAt
			)}`
		)
		return
	}

	// Get latest values of cumulative fields
	let { tvlEth: tvlEthDecimal, totalDeposits } =
		(await prismaClient.metricDepositHourly.findFirst({
			select: {
				tvlEth: true,
				totalDeposits: true
			},
			orderBy: { timestamp: 'desc' }
		})) || { tvlEth: 0, totalDeposits: 0 }
	let tvlEth = tvlEthDecimal ? Number(tvlEthDecimal) : 0

	// Get logs from view
	const logs = await prismaClient.viewHourlyDepositData.findMany({
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
	let changeDeposits = 0

	// Get multipliers for each strategy
	const sharesToUnderlying = await getSharesToUnderlying()
	const ethPrices = await getEthPrices()

	for (const l in logs) {
		const log = logs[l]

		const hour = log.timestamp.getTime()

		if (hour !== currentTimestamp) {
			// Completed data capture for records for a given hour
			tvlEth += changeTvlEth
			totalDeposits += changeDeposits

			depositHourlyList.push({
				timestamp: new Date(currentTimestamp),
				tvlEth: new prisma.Prisma.Decimal(tvlEth),
				totalDeposits,
				changeTvlEth: new prisma.Prisma.Decimal(changeTvlEth),
				changeDeposits
			})

			// Reset for next hour
			changeTvlEth = 0
			changeDeposits = 0
			currentTimestamp = hour
		}

		const sharesMultiplier = Number(
			sharesToUnderlying.get(log.strategyAddress.toLowerCase())
		)
		const ethPrice = Number(ethPrices.get(log.strategyAddress.toLowerCase()))

		if (sharesMultiplier && ethPrice) {
			changeTvlEth +=
				(Number(log.totalShares) / 1e18) * sharesMultiplier * ethPrice
			changeDeposits += log.totalDeposits
		}
	}

	// Last hour
	if (changeTvlEth > 0 || changeDeposits > 0) {
		tvlEth += changeTvlEth
		totalDeposits += changeDeposits

		depositHourlyList.push({
			timestamp: new Date(currentTimestamp),
			tvlEth: new prisma.Prisma.Decimal(tvlEth),
			totalDeposits,
			changeTvlEth: new prisma.Prisma.Decimal(changeTvlEth),
			changeDeposits
		})
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (startAt.getTime() === baseTime) {
		dbTransactions.push(prismaClient.metricDepositHourly.deleteMany())
	}

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
		`[Metrics] Deposit Hourly from: ${startAt} to: ${new Date(endAt)} size: ${
			depositHourlyList.length
		}`
	)

	// Storing last synced block
	await saveLastSyncBlock(timeSyncKey, BigInt(endAt))
}
