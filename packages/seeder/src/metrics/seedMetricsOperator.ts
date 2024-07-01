import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	IMap,
	loopThroughDates
} from '../utils/seeder'

const blockSyncKey = 'lastSyncedTimestamp_metrics_operatorHourly'

export async function seedMetricsOperatorHourly() {
	const prismaClient = getPrismaClient()

	// Constants
	const sharesToUnderlyingList = await prismaClient.strategies.findMany({
		select: { sharesToUnderlying: true, address: true }
	})

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

	// Get the last known metrics for operators
	const lastOperatorMetrics = await getLatestMetricsPerOperator()

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
				prismaClient.metricOperatorHourly.createMany({
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
				`[Metrics] Metric Operator from: ${from.getTime()} to: ${to.getTime()} size: ${
					tvlRecords.length
				}`
			)
		},
		frequency
	)

	// Hourly loop tick
	async function hourlyLoopTick(fromHour: Date, toHour: Date, orderedLogs) {
		const operatorAddresses = new Set<string>()
		const operatorStakers: IMap<string, number> = new Map()
		const operatorStrategyShares: IMap<string, IMap<string, bigint>> = new Map()

		const hourlyLogs = orderedLogs.filter(
			(ol) => ol.blockTime > fromHour && ol.blockTime <= toHour
		)

		for (const ol of hourlyLogs) {
			const operatorAddress = ol.operator.toLowerCase()

			operatorAddresses.add(operatorAddress)

			if (
				ol.type === 'OperatorSharesIncreased' ||
				ol.type === 'OperatorSharesDecreased'
			) {
				const strategyAddress = ol.strategy.toLowerCase()
				const shares = ol.shares

				if (!operatorStrategyShares.has(operatorAddress)) {
					operatorStrategyShares.set(operatorAddress, new Map())
				}

				if (!operatorStrategyShares.get(operatorAddress).has(strategyAddress)) {
					operatorStrategyShares.get(operatorAddress).set(strategyAddress, 0n)
				}

				if (ol.type === 'OperatorSharesIncreased') {
					operatorStrategyShares
						.get(operatorAddress)
						.set(
							strategyAddress,
							operatorStrategyShares.get(operatorAddress).get(strategyAddress) +
								BigInt(shares)
						)
				} else if (ol.type === 'OperatorSharesDecreased') {
					operatorStrategyShares
						.get(operatorAddress)
						.set(
							strategyAddress,
							operatorStrategyShares.get(operatorAddress).get(strategyAddress) -
								BigInt(shares)
						)
				}
			} else if (
				ol.type === 'StakerDelegated' ||
				ol.type === 'StakerUndelegated'
			) {
				if (!operatorStakers.has(operatorAddress)) {
					operatorStakers.set(operatorAddress, 0)
				}

				if (ol.type === 'StakerDelegated') {
					operatorStakers.set(
						operatorAddress,
						operatorStakers.get(operatorAddress) + 1
					)
				} else if (ol.type === 'StakerUndelegated') {
					operatorStakers.set(
						operatorAddress,
						operatorStakers.get(operatorAddress) - 1
					)
				}
			}
		}

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const tvlRecords: any[] = []

		for (const operatorAddress of operatorAddresses) {
			let tvlEth = 0
			let changeTvlEth = 0
			let totalStakers = 0

			if (
				operatorStrategyShares.has(operatorAddress) ||
				operatorStakers.has(operatorAddress)
			) {
				// Get the previous tvl metric
				const lastOperatorMetric = lastOperatorMetrics.get(operatorAddress)
				if (!lastOperatorMetric) {
					lastOperatorMetrics.set(operatorAddress, {
						id: 0,
						operatorAddress: operatorAddress,
						tvlEth: new prisma.Prisma.Decimal(0),
						totalStakers: 0,
						changeTvlEth: new prisma.Prisma.Decimal(0),
						changeStakers: 0,
						timestamp: toHour
					})
				} else {
					tvlEth = Number(lastOperatorMetric.tvlEth)
					totalStakers = lastOperatorMetric.totalStakers
				}

				// Capture and calculate changeTvlEth value
				const strategyMap = operatorStrategyShares.get(operatorAddress)
				if (strategyMap) {
					Array.from(strategyMap).map(([strategyAddress, shares]) => {
						const foundSharesToUnderlying = sharesToUnderlyingList.find(
							(s) => s.address === strategyAddress
						)

						if (foundSharesToUnderlying) {
							const ethPrice = 1
							const sharesToUnderlying = BigInt(
								foundSharesToUnderlying.sharesToUnderlying
							)

							changeTvlEth +=
								(Number(shares * sharesToUnderlying) / 1e36) * ethPrice
						}
					})
				}

				// Capture and calculate changeStakers value
				const changeStakers = operatorStakers.get(operatorAddress) || 0

				// Record all data back to rolling last operator metrics
				lastOperatorMetrics.set(operatorAddress, {
					id: 0,
					operatorAddress,
					tvlEth: Number(
						tvlEth + changeTvlEth
					) as unknown as prisma.Prisma.Decimal,
					changeTvlEth: Number(
						changeTvlEth
					) as unknown as prisma.Prisma.Decimal,
					totalStakers: totalStakers + changeStakers,
					changeStakers,
					timestamp: toHour
				})

				// Add data to tvl records
				tvlRecords.push({
					operatorAddress,
					timestamp: toHour,
					tvlEth: tvlEth + changeTvlEth,
					totalStakers: totalStakers + changeStakers,
					changeTvlEth,
					changeStakers
				})
			}
		}

		return tvlRecords
	}
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

	const logs_osInc = (
		await prismaClient.eventLogs_OperatorSharesIncreased.findMany({
			where: query
		})
	).map((l) => ({ ...l, type: 'OperatorSharesIncreased' }))

	const logs_osDec = (
		await prismaClient.eventLogs_OperatorSharesDecreased.findMany({
			where: query
		})
	).map((l) => ({ ...l, type: 'OperatorSharesDecreased' }))

	const logs_stakersInc = (
		await prismaClient.eventLogs_StakerDelegated.findMany({
			where: query
		})
	).map((l) => ({ ...l, type: 'StakerDelegated' }))

	const logs_stakersDec = (
		await prismaClient.eventLogs_StakerUndelegated.findMany({
			where: query
		})
	).map((l) => ({ ...l, type: 'StakerUndelegated' }))

	const orderedLogs = [
		...logs_osInc,
		...logs_osDec,
		...logs_stakersInc,
		...logs_stakersDec
	].sort((a, b) => {
		if (a.blockNumber === b.blockNumber) {
			return a.transactionIndex - b.transactionIndex
		}

		return Number(a.blockNumber - b.blockNumber)
	})

	return orderedLogs
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const firstLogOsInc =
		await prismaClient.eventLogs_OperatorSharesIncreased.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		})

	const firstLogOsDec =
		await prismaClient.eventLogs_OperatorSharesDecreased.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		})

	const firstLogStakerInc =
		await prismaClient.eventLogs_StakerDelegated.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		})

	const firstLogStakerDec =
		await prismaClient.eventLogs_StakerUndelegated.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		})

	if (
		!firstLogOsInc &&
		!firstLogOsDec &&
		!firstLogStakerInc &&
		!firstLogStakerDec
	) {
		return null
	}

	const firstLogOsIncTs = firstLogOsInc?.blockTime?.getTime() ?? Infinity
	const firstLogOsDecTs = firstLogOsDec?.blockTime?.getTime() ?? Infinity
	const firstLogStakerIncTs =
		firstLogStakerInc?.blockTime?.getTime() ?? Infinity
	const firstLogStakerDecTs =
		firstLogStakerDec?.blockTime?.getTime() ?? Infinity

	return Math.min(
		firstLogOsIncTs,
		firstLogOsDecTs,
		firstLogStakerIncTs,
		firstLogStakerDecTs
	)
}

/**
 * Get latest metrics per operator
 *
 * @returns
 */
async function getLatestMetricsPerOperator(): Promise<
	IMap<string, prisma.MetricOperatorHourly>
> {
	const prismaClinet = getPrismaClient()

	try {
		const lastMetricsPerOperator =
			await prismaClinet.metricOperatorHourly.groupBy({
				by: ['operatorAddress'],
				_max: {
					timestamp: true
				}
			})

		const metrics = await prismaClinet.metricOperatorHourly.findMany({
			where: {
				OR: lastMetricsPerOperator.map((metric) => ({
					operatorAddress: metric.operatorAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricOperatorHourlyWhereInput[]
			},
			orderBy: {
				operatorAddress: 'asc'
			}
		})

		return metrics
			? new Map(metrics.map((metric) => [metric.operatorAddress, metric]))
			: new Map()
	} catch {}

	return new Map()
}
