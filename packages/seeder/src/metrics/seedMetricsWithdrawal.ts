import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	getSharesToUnderlying,
	getEthPrices,
	getStrategyToSymbolMap
} from '../utils/strategies'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime
} from '../utils/seeder'

const timeSyncKey = 'lastSyncedTime_metrics_withdrawal'

export async function seedMetricsWithdrawal() {
	const prismaClient = getPrismaClient()

	// Define start date
	let startAt: Date | null = await fetchLastSyncTime(timeSyncKey)
	const endAt: Date = new Date(new Date().setUTCHours(0, 0, 0, 0))	
	let clearPrev = false

	if (!startAt) {
		const firstLogTimestamp = await getFirstLogTimestamp()
		if (firstLogTimestamp) {
			startAt = new Date(new Date(firstLogTimestamp).setUTCHours(0, 0, 0, 0))
		} else {
			startAt = new Date(new Date().setUTCHours(0, 0, 0, 0))
		}
		clearPrev = true
	}

	// Bail early if there is no time diff to sync
	if (endAt.getTime() - startAt.getTime() <= 0) {
		console.log(
			`[In Sync] [Metrics] Withdrawal Daily from: ${startAt} to: ${endAt}`
		)
		return
	}

	// Clear previous data
	if (clearPrev) {
		await prismaClient.metricWithdrawalUnit.deleteMany()
	}

	// Fetch required data for processing
	const [strategyToSymbolMap, sharesToUnderlying, ethPriceData] = await Promise.all([
		getStrategyToSymbolMap(),
		getSharesToUnderlying(),
		getEthPrices(startAt.getTime())
	])

	// Get latest cumulative metrics
	let { tvlEth, totalWithdrawals } = await getLatestMetrics(prismaClient)

	// Process withdrawals in batches of 30 days
	const batchSize = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
	let currentStartAt = new Date(startAt)
	let allWithdrawalList: any[] = []

	// Loop through each batch
	while (currentStartAt < endAt) {
		let currentEndAt = new Date(Math.min(currentStartAt.getTime() + batchSize, endAt.getTime()))

		const batchWithdrawalList = await processWithdrawals(
			currentStartAt,
			currentEndAt,
			tvlEth,
			totalWithdrawals,
			strategyToSymbolMap,
			sharesToUnderlying,
			ethPriceData
		)

		allWithdrawalList = allWithdrawalList.concat(batchWithdrawalList)

		// Update cumulative metrics for the next batch
		if (batchWithdrawalList.length > 0) {
			const lastMetric = batchWithdrawalList[batchWithdrawalList.length - 1]
			tvlEth = Number(lastMetric.tvlEth)
			totalWithdrawals = lastMetric.totalWithdrawals
		}

		currentStartAt = new Date(currentEndAt.getTime() + 1) // Start next batch from the next millisecond
	}

	// Prepare database transactions
	const dbTransactions: Prisma.PrismaPromise<any>[] = []

	// Insert new withdrawal metrics
	if (allWithdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.metricWithdrawalUnit.createMany({
				data: allWithdrawalList,
				skipDuplicates: true
			})
		)
	}

	// Update last synced time
	dbTransactions.push(
		prismaClient.settings.upsert({
			where: { key: timeSyncKey },
			update: { value: Number(endAt.getTime()) },
			create: { key: timeSyncKey, value: Number(endAt.getTime()) }
		})
	)

	// Execute all database transactions
	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Metrics] Withdrawal Daily from: ${startAt} to: ${endAt} size: ${allWithdrawalList.length}`
	)
}

/**
 * Process withdrawals and calculate metrics
 */
async function processWithdrawals(
	startAt: Date,
	endAt: Date,
	initialTvlEth: number,
	initialTotalWithdrawals: number,
	strategyToSymbolMap: Map<string, string>,
	sharesToUnderlying: Map<string, string>,
	ethPriceData: any
) {
	const prismaClient = getPrismaClient()

	// Fetch withdrawals within the specified time range
	const allWithdrawals = await prismaClient.withdrawalQueued.findMany({
		include: {
			completedWithdrawal: true
		},
		where: {
			createdAt: {
				gt: startAt,
				lte: endAt
			},
			completedWithdrawal: {
				isNot: null
			}
		}
	})

	// Calculate daily withdrawals
	const dailyWithdrawals = allWithdrawals.reduce((acc, withdrawal) => {
		const dayTimestamp = new Date(withdrawal.createdAt).setUTCHours(0, 0, 0, 0);
		if (!acc[dayTimestamp]) {
			acc[dayTimestamp] = {
				timestamp: new Date(dayTimestamp),
				tvlEth: 0,
				totalWithdrawals: 0,
				changeTvlEth: 0,
				changeWithdrawals: 0
			};
		}

		withdrawal.strategies.forEach((strategyAddress, index) => {
			const symbol = strategyToSymbolMap.get(strategyAddress)?.toLowerCase();
			const sharesMultiplier = Number(sharesToUnderlying.get(strategyAddress.toLowerCase()));
			const ethPrice = Number(ethPriceData.find((price) => price.symbol.toLowerCase() === symbol)?.ethPrice) || 0;

			if (sharesMultiplier && ethPrice) {
				const shares = withdrawal.shares[index];
				const withdrawalValueEth = (Number(shares) / 1e18) * sharesMultiplier * ethPrice;
				acc[dayTimestamp].changeTvlEth = Number(acc[dayTimestamp].changeTvlEth) + withdrawalValueEth;
			}
		});

		acc[dayTimestamp].changeWithdrawals += 1;

		return acc;
	}, {} as Record<number, Omit<Prisma.MetricWithdrawalUnitCreateInput, 'id'>>);

	// Calculate cumulative metrics
	const cumulativeWithdrawals = Object.values(dailyWithdrawals)
		.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
		.map((dayData, index, array) => {
			if (index > 0) {
				dayData.tvlEth = new Prisma.Decimal(
					Number(array[index - 1].tvlEth) + Number(dayData.changeTvlEth)
				);
				dayData.totalWithdrawals = array[index - 1].totalWithdrawals + dayData.changeWithdrawals;
			} else {
				dayData.tvlEth = new Prisma.Decimal(initialTvlEth + Number(dayData.changeTvlEth));
				dayData.totalWithdrawals = initialTotalWithdrawals + dayData.changeWithdrawals;
			}
			return {
				...dayData,
				tvlEth: dayData.tvlEth,
				changeTvlEth: dayData.changeTvlEth
			};
		});

	return cumulativeWithdrawals
}

/**
 * Get latest metrics
 */
async function getLatestMetrics(prismaClient: Prisma.TransactionClient) {
	const latestMetric = await prismaClient.metricWithdrawalUnit.findFirst({
		select: {
			tvlEth: true,
			totalWithdrawals: true
		},
		orderBy: { timestamp: 'desc' }
	})
	return {
		tvlEth: latestMetric?.tvlEth ? Number(latestMetric.tvlEth) : 0,
		totalWithdrawals: latestMetric?.totalWithdrawals || 0
	}
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