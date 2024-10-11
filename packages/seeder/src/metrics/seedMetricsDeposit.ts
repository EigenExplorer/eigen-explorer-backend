import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getSharesToUnderlying, getEthPrices, getStrategyToSymbolMap } from '../utils/strategies'
import { bulkUpdateDbTransactions, fetchLastSyncTime } from '../utils/seeder'

const timeSyncKey = 'lastSyncedTime_metrics_deposit'

export async function seedMetricsDeposit() {
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
		console.log(`[In Sync] [Metrics] Deposit Daily from: ${startAt} to: ${endAt}`)
		return
	}

	// Clear previous data
	if (clearPrev) {
		await prismaClient.metricDepositUnit.deleteMany()
	}

	// Fetch required data for processing
	const [strategyToSymbolMap, sharesToUnderlying, ethPriceData] = await Promise.all([
		getStrategyToSymbolMap(),
		getSharesToUnderlying(),
		getEthPrices(startAt.getTime())
	])

	// Get latest cumulative metrics
	let { tvlEth, totalDeposits } = await getLatestMetrics(prismaClient)

	// Process deposits in batches of 30 days
	const batchSize = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
	let currentStartAt = new Date(startAt)
	let allDepositList: any[] = []

	// Loop through each batch
	while (currentStartAt < endAt) {
		let currentEndAt = new Date(Math.min(currentStartAt.getTime() + batchSize, endAt.getTime()))

		const batchDepositList = await processDeposits(
			currentStartAt,
			currentEndAt,
			tvlEth,
			totalDeposits,
			strategyToSymbolMap,
			sharesToUnderlying,
			ethPriceData
		)

		allDepositList = allDepositList.concat(batchDepositList)

		// Update cumulative metrics for the next batch
		if (batchDepositList.length > 0) {
			const lastMetric = batchDepositList[batchDepositList.length - 1]
			tvlEth = Number(lastMetric.tvlEth)
			totalDeposits = lastMetric.totalDeposits
		}

		currentStartAt = new Date(currentEndAt.getTime() + 1) // Start next batch from the next millisecond
	}

	// Prepare database transactions
	const dbTransactions: Prisma.PrismaPromise<any>[] = []

	// Insert new deposit metrics
	if (allDepositList.length > 0) {
		dbTransactions.push(
			prismaClient.metricDepositUnit.createMany({
				data: allDepositList,
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
		`[Metrics] Deposit Daily from: ${startAt} to: ${endAt} size: ${allDepositList.length}`
	)
}

/**
 * Process deposits and calculate metrics
 *
 * @param startAt
 * @param endAt
 * @param initialTvlEth
 * @param initialTotalDeposits
 * @param strategyToSymbolMap
 * @param sharesToUnderlying
 * @param ethPriceData
 * @returns
 */
async function processDeposits(
	startAt: Date,
	endAt: Date,
	initialTvlEth: number,
	initialTotalDeposits: number,
	strategyToSymbolMap: Map<string, string>,
	sharesToUnderlying: Map<string, string>,
	ethPriceData: any
) {
	const prismaClient = getPrismaClient()

	// Fetch deposits within the specified time range
	const allDeposits = await prismaClient.deposit.findMany({
		where: {
			createdAt: {
				gt: startAt,
				lte: endAt
			}
		}
	})

	// Calculate daily deposits
	const dailyDeposits = allDeposits.reduce((acc, deposit) => {
		const dayTimestamp = new Date(deposit.createdAt).setUTCHours(0, 0, 0, 0)
		if (!acc[dayTimestamp]) {
			acc[dayTimestamp] = {
				timestamp: new Date(dayTimestamp),
				tvlEth: 0,
				totalDeposits: 0,
				changeTvlEth: 0,
				changeDeposits: 0
			}
		}

		const symbol = strategyToSymbolMap.get(deposit.strategyAddress)?.toLowerCase()
		const sharesMultiplier = Number(sharesToUnderlying.get(deposit.strategyAddress.toLowerCase()))
		const ethPrice =
			Number(ethPriceData.find((price) => price.symbol.toLowerCase() === symbol)?.ethPrice) || 0

		if (sharesMultiplier && ethPrice) {
			const depositValueEth = (Number(deposit.shares) / 1e18) * sharesMultiplier * ethPrice
			acc[dayTimestamp].changeTvlEth = Number(acc[dayTimestamp].changeTvlEth) + depositValueEth
			acc[dayTimestamp].changeDeposits += 1
		}

		return acc
	}, {} as Record<number, Omit<Prisma.MetricDepositUnitCreateInput, 'id'>>)

	// Calculate cumulative metrics
	const cumulativeDeposits = Object.values(dailyDeposits)
		.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
		.map((dayData, index, array) => {
			if (index > 0) {
				dayData.tvlEth = new Prisma.Decimal(
					Number(array[index - 1].tvlEth) + Number(dayData.changeTvlEth)
				)
				dayData.totalDeposits = array[index - 1].totalDeposits + dayData.changeDeposits
			} else {
				dayData.tvlEth = new Prisma.Decimal(initialTvlEth + Number(dayData.changeTvlEth))
				dayData.totalDeposits = initialTotalDeposits + dayData.changeDeposits
			}
			return {
				...dayData,
				tvlEth: dayData.tvlEth,
				changeTvlEth: dayData.changeTvlEth
			}
		})

	return cumulativeDeposits
}

/**
 * Get latest metrics
 *
 * @param prismaClient
 * @returns
 */
async function getLatestMetrics(prismaClient: Prisma.TransactionClient) {
	const latestMetric = await prismaClient.metricDepositUnit.findFirst({
		select: {
			tvlEth: true,
			totalDeposits: true
		},
		orderBy: { timestamp: 'desc' }
	})
	return {
		tvlEth: latestMetric?.tvlEth ? Number(latestMetric.tvlEth) : 0,
		totalDeposits: latestMetric?.totalDeposits || 0
	}
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const firstLog = await prismaClient.deposit.findFirst({
		select: { createdAt: true },
		orderBy: { createdAt: 'asc' }
	})

	return firstLog ? firstLog.createdAt : null
}
