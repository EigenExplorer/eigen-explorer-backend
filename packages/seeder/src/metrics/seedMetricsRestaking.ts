import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncTime,
	IMap,
	loopThroughDates,
	setToStartOfDay
} from '../utils/seeder'
import { chunkArray } from '../utils/array'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL,
	StrategyWithShareUnderlying
} from '../utils/strategyShares'

const blockSyncKey = 'lastSyncedTimestamp_metrics_restaking'
const BATCH_DAYS = 1

// Define the type for our log entries
type ILastOperatorMetric = Omit<prisma.MetricOperatorUnit, 'id'>
type ILastAvsMetric = Omit<prisma.MetricAvsUnit, 'id'>
type ILastOperatorStrategyMetric = Omit<prisma.MetricOperatorStrategyUnit, 'id'>
type ILastAvsStrategyMetric = Omit<prisma.MetricAvsStrategyUnit, 'id'>
type ILastOperatorMetrics = IMap<string, ILastOperatorMetric>
type ILastAvsMetrics = IMap<string, ILastAvsMetric>
type ILastOperatorStrategyMetrics = IMap<string, IMap<string, ILastOperatorStrategyMetric>>
type ILastAvsStrategyMetrics = IMap<string, IMap<string, ILastAvsStrategyMetric>>
type LogEntry = {
	blockTime: Date
	blockNumber: bigint
	transactionIndex: number
	type: string

	operator: string
	strategy: string
	shares: string
	staker: string

	avs: string
	status: number
}
type MetricRecords = [
	ILastOperatorMetric[],
	ILastOperatorStrategyMetric[],
	ILastAvsMetric[],
	ILastAvsStrategyMetric[]
]
// Global State
// operatorAddress -> stakerAddress -> strategyAddress -> shares
let operatorStakersList: IMap<string, Map<string, Map<string, bigint>>> = new Map()

let avsOperatorsRestakedStrategiesMap: IMap<string, Map<string, string[]>> = new Map()
let avsOperatorsState: IMap<string, Set<string>> = new Map()
let strategiesWithSharesUnderlying: StrategyWithShareUnderlying[] = []

// Last Metrics
let lastOperatorMetrics: ILastOperatorMetrics = new Map()
let lastOperatorStrategyMetrics: ILastOperatorStrategyMetrics = new Map()
let lastAvsMetrics: ILastAvsMetrics = new Map()
let lastAvsStrategyMetrics: ILastAvsStrategyMetrics = new Map()

export async function seedMetricsRestaking(type: 'full' | 'incremental' = 'incremental') {
	console.log('[Seed] Metric Restaking ...')

	const prismaClient = getPrismaClient()

	// Define start date
	let startDate: Date | null = await fetchLastSyncTime(blockSyncKey)
	const endDate: Date = new Date(new Date().setUTCHours(0, 0, 0, 0))
	let clearPrev = false

	if (type === 'full' || !startDate) {
		const firstLogTimestamp = await getFirstLogTimestamp()
		if (firstLogTimestamp) {
			startDate = new Date(new Date(firstLogTimestamp).setUTCHours(0, 0, 0, 0))
		} else {
			startDate = new Date(new Date().setUTCHours(0, 0, 0, 0))
		}
		clearPrev = true
	}

	// Bail early if there is no time diff to sync
	if (endDate.getTime() - startDate.getTime() <= 0) {
		console.log(`[In Sync] [Metrics] Restaking Daily from: ${startDate} to: ${endDate}`)
		return
	}

	console.time('[Prep] Metric Restaking ...')

	// Clear previous data
	operatorStakersList = new Map()
	avsOperatorsRestakedStrategiesMap = new Map()
	avsOperatorsState = new Map()
	strategiesWithSharesUnderlying = []
	lastOperatorMetrics = new Map()
	lastOperatorStrategyMetrics = new Map()
	lastAvsMetrics = new Map()
	lastAvsStrategyMetrics = new Map()

	// Fetch constant data
	strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()
	avsOperatorsState = await getAvsOperatorsState(startDate)
	avsOperatorsRestakedStrategiesMap = await getAvsOperatorsRestakedStrategies()

	// Fetch last metrics
	if (!clearPrev) {
		lastOperatorMetrics = await getLatestMetricsPerOperator()
		lastOperatorStrategyMetrics = await getLatestMetricsPerOperatorStrategy()
		lastAvsMetrics = await getLatestMetricsPerAvs()
		lastAvsStrategyMetrics = await getLatestMetricsPerAvsStrategy()
	}

	console.timeEnd('[Prep] Metric Restaking ...')

	// Process logs in batches
	const [operatorMetrics, operatorStrategyMetrics, avsMetrics, avsStrategyMetrics] =
		await processLogsInBatches(startDate, endDate)

	// Update data
	await bulkUpdateDbTransactions(
		[
			...(clearPrev
				? [
						prismaClient.metricOperatorUnit.deleteMany(),
						prismaClient.metricOperatorStrategyUnit.deleteMany(),
						prismaClient.metricAvsUnit.deleteMany(),
						prismaClient.metricAvsStrategyUnit.deleteMany()
				  ]
				: []),

			...chunkArray(operatorMetrics, 10000).map((data) =>
				prismaClient.metricOperatorUnit.createMany({
					data,
					skipDuplicates: true
				})
			),

			...chunkArray(operatorStrategyMetrics, 10000).map((data) =>
				prismaClient.metricOperatorStrategyUnit.createMany({
					data,
					skipDuplicates: true
				})
			),

			...chunkArray(avsMetrics, 10000).map((data) =>
				prismaClient.metricAvsUnit.createMany({
					data,
					skipDuplicates: true
				})
			),

			...chunkArray(avsStrategyMetrics, 10000).map((data) =>
				prismaClient.metricAvsStrategyUnit.createMany({
					data,
					skipDuplicates: true
				})
			),

			prismaClient.settings.upsert({
				where: { key: blockSyncKey },
				update: { value: Number(endDate.getTime()) },
				create: { key: blockSyncKey, value: Number(endDate.getTime()) }
			})
		],
		`[Metrics] Metric Restaking from: ${startDate.toISOString()} to: ${endDate.toISOString()} size: ${
			operatorMetrics.length
		}`
	)
}

/**
 * Process logs in batches
 *
 * @param startDate
 * @param endDate
 * @returns
 */
async function processLogsInBatches(startDate: Date, endDate: Date): Promise<MetricRecords> {
	const operatorMetrics: ILastOperatorMetric[] = []
	const operatorStrategyMetrics: ILastOperatorStrategyMetric[] = []
	const avsMetrics: ILastAvsMetric[] = []
	const avsStrategyMetrics: ILastAvsStrategyMetric[] = []

	for (
		let currentDate = setToStartOfDay(startDate);
		currentDate < setToStartOfDay(endDate);
		currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS)
	) {
		const batchEndDate = new Date(
			Math.min(currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS, endDate.getTime())
		)

		// Fetch logs
		const batchLogs = await fetchOrderedLogs(currentDate, batchEndDate)

		console.time(`[Batch Process] ${currentDate.toISOString()} to ${batchEndDate.toISOString()}`)
		await loopThroughDates(
			currentDate,
			batchEndDate,
			async (fromHour, toHour) => {
				const [operatorTvlRecords, operatorStrategyRecords, avsTvlRecords, avsStrategyRecords] =
					await loopTick(fromHour, toHour, batchLogs)

				operatorMetrics.push(...operatorTvlRecords)
				operatorStrategyMetrics.push(...operatorStrategyRecords)
				avsMetrics.push(...avsTvlRecords)
				avsStrategyMetrics.push(...avsStrategyRecords)
			},
			'daily'
		)
		console.timeEnd(`[Batch Process] ${currentDate.toISOString()} to ${batchEndDate.toISOString()}`)

		console.log(
			`[Batch] Metric Restaking from: ${currentDate.toISOString()} to: ${batchEndDate.toISOString()} count: ${
				operatorMetrics.length
			}`
		)
	}

	return [operatorMetrics, operatorStrategyMetrics, avsMetrics, avsStrategyMetrics]
}

/**
 * Loop through each tick
 *
 * @param fromHour
 * @param toHour
 * @param orderedLogs
 * @returns
 */
async function loopTick(
	fromDate: Date,
	toDate: Date,
	orderedLogs: LogEntry[]
): Promise<MetricRecords> {
	const operatorAddresses = new Set<string>()
	const strategyAddresses = new Set<string>()
	const operatorStrategyShares = new Map<string, Map<string, bigint>>()
	const strategyShares = new Map<string, bigint>()
	const operatorTvlRecords: ILastOperatorMetric[] = []
	const avsTvlRecords: ILastAvsMetric[] = []
	const operatorStrategyTvlRecords: ILastOperatorStrategyMetric[] = []
	const avsStrategyTvlRecords: ILastAvsStrategyMetric[] = []

	// Filter logs by date range
	const logs = orderedLogs.filter((ol) => ol.blockTime > fromDate && ol.blockTime <= toDate)

	// Process logs
	for (const ol of logs) {
		const operatorAddress = ol.operator.toLowerCase()
		operatorAddresses.add(operatorAddress)

		if (ol.type === 'OperatorSharesIncreased' || ol.type === 'OperatorSharesDecreased') {
			const shares = BigInt(ol.shares)
			const strategyAddress = ol.strategy.toLowerCase()
			strategyAddresses.add(strategyAddress)

			const operatorShares = operatorStrategyShares.get(operatorAddress) || new Map()
			operatorStrategyShares.set(operatorAddress, operatorShares)

			const currentShares = operatorShares.get(strategyAddress) || 0n
			const newShares =
				ol.type === 'OperatorSharesIncreased' ? currentShares + shares : currentShares - shares
			operatorShares.set(strategyAddress, newShares)

			const currentStrategyShares = strategyShares.get(strategyAddress) || 0n
			strategyShares.set(
				strategyAddress,
				ol.type === 'OperatorSharesIncreased'
					? currentStrategyShares + shares
					: currentStrategyShares - shares
			)

			// Update Staker Shares
			if (!operatorStakersList.has(operatorAddress)) {
				operatorStakersList.set(operatorAddress, new Map())
			}
			if (!operatorStakersList.get(operatorAddress)?.has(ol.staker)) {
				operatorStakersList.get(operatorAddress)?.set(ol.staker, new Map())
			}

			const operatorStakerMap = operatorStakersList.get(operatorAddress)?.get(ol.staker)
			const currentOperatorStakerShares = operatorStakerMap?.get(strategyAddress) || 0n

			operatorStakerMap?.set(
				strategyAddress,
				currentOperatorStakerShares + (ol.type === 'OperatorSharesIncreased' ? shares : -shares)
			)
		} else if (ol.type === 'StakerDelegated' || ol.type === 'StakerUndelegated') {
			if (!operatorStakersList.has(operatorAddress)) {
				operatorStakersList.set(operatorAddress, new Map())
			}

			if (ol.type === 'StakerDelegated') {
				operatorStakersList.get(operatorAddress)?.set(ol.staker, new Map())
			} else {
				operatorStakersList.get(operatorAddress)?.delete(ol.staker)
			}
		} else if (ol.type === 'OperatorAVSRegistrationStatusUpdated') {
			const avsAddress = ol.avs.toLowerCase()
			const status = Number(ol.status)

			if (!avsOperatorsState.has(avsAddress)) {
				avsOperatorsState.set(avsAddress, new Set())
			}

			if (status === 1) {
				avsOperatorsState.get(avsAddress).add(operatorAddress)
			} else {
				avsOperatorsState.get(avsAddress).delete(operatorAddress)
			}
		}
	}

	// Process Operator Metrics
	for (const operatorAddress of operatorAddresses) {
		// Fetch last known metric
		const lastOperatorMetric = lastOperatorMetrics.get(operatorAddress) || {
			operatorAddress,
			totalStakers: 0,
			changeStakers: 0,
			totalAvs: 0,
			changeAvs: 0,
			timestamp: toDate
		}

		// Update Staker and Avs Change
		const opeartorStakersMap = operatorStakersList.get(operatorAddress)
		const totalStakers = opeartorStakersMap
			? Array.from(opeartorStakersMap.values()).filter(
					(strategyMap) =>
						Array.from(strategyMap.values()).filter((shares) => shares > 0n).length > 0
			  ).length
			: 0
		const totalAvs = getOperatorAvsCount(avsOperatorsState, operatorAddress)
		const changeAvs = totalAvs - lastOperatorMetric.totalAvs
		const changeStakers = totalStakers - lastOperatorMetric.totalStakers

		if (
			lastOperatorMetric.totalStakers !== totalStakers ||
			lastOperatorMetric.totalAvs !== totalAvs
		) {
			// Update Operator Metrics
			const newOperatorMetric = {
				...lastOperatorMetric,
				totalStakers: lastOperatorMetric.totalStakers + changeStakers,
				changeStakers,
				totalAvs,
				changeAvs,
				timestamp: toDate
			}

			lastOperatorMetrics.set(operatorAddress, newOperatorMetric)
			operatorTvlRecords.push(newOperatorMetric)
		}

		// Update TVL Change
		const strategyMap = operatorStrategyShares.get(operatorAddress)
		if (!strategyMap) continue

		for (const [strategyAddress, shares] of strategyMap) {
			let changeTvl = 0

			// Shares to TVL [TODO]
			const tvl = sharesToTVL(
				[{ strategyAddress, shares: shares.toString() }],
				strategiesWithSharesUnderlying
			)

			changeTvl += tvl.tvl

			if (!lastOperatorStrategyMetrics.has(operatorAddress)) {
				lastOperatorStrategyMetrics.set(operatorAddress, new Map())
			}

			const lastOperatorStrategyMetric = lastOperatorStrategyMetrics
				.get(operatorAddress)
				.get(strategyAddress) || {
				operatorAddress,
				strategyAddress,
				tvl: new prisma.Prisma.Decimal(0),
				changeTvl: new prisma.Prisma.Decimal(0),
				timestamp: toDate
			}

			const newOperatorStrategyMetric = {
				...lastOperatorStrategyMetric,
				tvl: new prisma.Prisma.Decimal(Number(lastOperatorStrategyMetric.tvl) + changeTvl),
				changeTvl: new prisma.Prisma.Decimal(changeTvl),
				timestamp: toDate
			}

			lastOperatorStrategyMetrics
				.get(operatorAddress)
				.set(strategyAddress, newOperatorStrategyMetric)

			operatorStrategyTvlRecords.push(newOperatorStrategyMetric)
		}
	}

	// Process AVS Metrics
	for (const [avsAddress, operatorAddresses] of avsOperatorsState) {
		let totalStakers = 0
		let totalOperators = 0
		// Track current total TVL per strategy instead of changes
		const strategyTvls: IMap<string, number> = new Map()

		for (const operatorAddress of operatorAddresses) {
			totalOperators++

			const operatorStakersMap = operatorStakersList.get(operatorAddress)
			const operatorRestakedStrategies =
				avsOperatorsRestakedStrategiesMap.get(avsAddress)?.get(operatorAddress) || []

			if (operatorStakersMap) {
				// Filter stakers who have positive shares in any of the restaked strategies
				const validStakers = Array.from(operatorStakersMap.entries()).filter(
					([_, strategyShares]) =>
						Array.from(strategyShares.entries()).some(
							([strategy, shares]) =>
								shares > 0n &&
								operatorRestakedStrategies.some(
									(restakedStrategy) => restakedStrategy.toLowerCase() === strategy.toLowerCase()
								)
						)
				)
				totalStakers += validStakers.length

				// Calculate TVL for each strategy
				for (const [_, strategyShares] of operatorStakersMap) {
					for (const [strategy, shares] of strategyShares) {
						// Only include strategies that are restaked for this AVS
						if (
							operatorRestakedStrategies.some(
								(restakedStrategy) => restakedStrategy.toLowerCase() === strategy.toLowerCase()
							)
						) {
							// Convert shares to TVL
							const tvl = sharesToTVL(
								[{ strategyAddress: strategy, shares: shares.toString() }],
								strategiesWithSharesUnderlying
							)

							// Add to total TVL for this strategy
							if (!strategyTvls.has(strategy)) {
								strategyTvls.set(strategy, 0)
							}

							strategyTvls.set(strategy, strategyTvls.get(strategy)! + tvl.tvl)
						}
					}
				}

				// const strategyMap = operatorStrategyShares.get(operatorAddress)
				// if (!strategyMap) continue

				// for (const [strategyAddress, shares] of strategyMap) {
				// 	if (
				// 		operatorRestakedStrategies.some(
				// 			(restakedStrategy) => restakedStrategy.toLowerCase() === strategyAddress.toLowerCase()
				// 		)
				// 	) {
				// 		const tvl = sharesToTVL(
				// 			[{ strategyAddress, shares: shares.toString() }],
				// 			strategiesWithSharesUnderlying
				// 		)

				// 		// Add to total TVL for this strategy
				// 		if (!strategyTvls.has(strategyAddress)) {
				// 			strategyTvls.set(strategyAddress, 0)
				// 		}
				// 		strategyTvls.set(strategyAddress, strategyTvls.get(strategyAddress)! + tvl.tvl)
				// 	}
				// }
			}
		}

		// Handle AVS metrics
		const lastMetric = lastAvsMetrics.get(avsAddress) || {
			avsAddress,
			totalStakers: 0,
			changeStakers: 0,
			totalOperators: 0,
			changeOperators: 0,
			timestamp: toDate
		}

		if (lastMetric.totalStakers !== totalStakers || lastMetric.totalOperators !== totalOperators) {
			const newAvsMetric = {
				...lastMetric,
				totalStakers,
				changeStakers: totalStakers - lastMetric.totalStakers,
				totalOperators,
				changeOperators: totalOperators - lastMetric.totalOperators,
				timestamp: toDate
			}

			lastAvsMetrics.set(avsAddress, newAvsMetric)
			avsTvlRecords.push(newAvsMetric)
		}

		// Process all strategies and calculate their final TVL state
		const strategyUpdates = new Map<
			string,
			{
				tvl: prisma.Prisma.Decimal
				changeTvl: prisma.Prisma.Decimal
			}
		>()

		// First handle current strategies
		for (const [strategyAddress, currentTvl] of strategyTvls) {
			const lastAvsStrategyMetric = lastAvsStrategyMetrics
				.get(avsAddress)
				?.get(strategyAddress) || {
				avsAddress,
				strategyAddress,
				tvl: new prisma.Prisma.Decimal(0),
				changeTvl: new prisma.Prisma.Decimal(0),
				timestamp: toDate
			}

			const changeTvl = currentTvl - Number(lastAvsStrategyMetric.tvl)

			if (changeTvl !== 0) {
				strategyUpdates.set(strategyAddress, {
					tvl: new prisma.Prisma.Decimal(currentTvl),
					changeTvl: new prisma.Prisma.Decimal(changeTvl)
				})
			}
		}

		// Then handle strategies that are no longer used
		// const lastStrategyMetrics = lastAvsStrategyMetrics.get(avsAddress)
		// if (lastStrategyMetrics) {
		// 	for (const [strategyAddress, lastMetric] of lastStrategyMetrics) {
		// 		if (!strategyTvls.has(strategyAddress) && Number(lastMetric.tvl) !== 0) {
		// 			strategyUpdates.set(strategyAddress, {
		// 				tvl: new prisma.Prisma.Decimal(0),
		// 				changeTvl: new prisma.Prisma.Decimal(-Number(lastMetric.tvl))
		// 			})
		// 		}
		// 	}
		// }

		// Create single record for each strategy that needs updating
		for (const [strategyAddress, update] of strategyUpdates) {
			const newAvsStrategyMetric = {
				avsAddress,
				strategyAddress,
				tvl: update.tvl,
				changeTvl: update.changeTvl,
				timestamp: toDate
			}

			// Update the last metrics map
			if (!lastAvsStrategyMetrics.has(avsAddress)) {
				lastAvsStrategyMetrics.set(avsAddress, new Map())
			}
			lastAvsStrategyMetrics.get(avsAddress)!.set(strategyAddress, newAvsStrategyMetric)

			// Add to records that will be saved to database
			avsStrategyTvlRecords.push(newAvsStrategyMetric)
		}
	}

	return [operatorTvlRecords, operatorStrategyTvlRecords, avsTvlRecords, avsStrategyTvlRecords]
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
	const query = { where: { blockTime: { gt: from, lte: to } } }

	console.time(`[Batch Logs] ${from.toISOString()} to ${to.toISOString()}`)
	const logs_osInc = await prismaClient.eventLogs_OperatorSharesIncreased.findMany(query)
	const logs_osDec = await prismaClient.eventLogs_OperatorSharesDecreased.findMany(query)

	const logs_stakersInc = await prismaClient.eventLogs_StakerDelegated.findMany(query)
	const logs_stakersDec = await prismaClient.eventLogs_StakerUndelegated.findMany(query)
	const logs_operatorRegStatus =
		await prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.findMany(query)
	console.timeEnd(`[Batch Logs] ${from.toISOString()} to ${to.toISOString()}`)

	const orderedLogs = [
		...logs_osInc.map((l) => ({ ...l, type: 'OperatorSharesIncreased' })),
		...logs_osDec.map((l) => ({ ...l, type: 'OperatorSharesDecreased' })),
		...logs_stakersInc.map((l) => ({ ...l, type: 'StakerDelegated' })),
		...logs_stakersDec.map((l) => ({ ...l, type: 'StakerUndelegated' })),
		...logs_operatorRegStatus.map((l) => ({
			...l,
			type: 'OperatorAVSRegistrationStatusUpdated'
		}))
	].sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.transactionIndex - b.transactionIndex)

	return orderedLogs as unknown as LogEntry[]
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const [
		firstLogOsInc,
		firstLogOsDec,
		firstLogStakerInc,
		firstLogStakerDec,
		firstLogOperatorRegStatus
	] = await Promise.all([
		prismaClient.eventLogs_OperatorSharesIncreased.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		}),
		prismaClient.eventLogs_OperatorSharesDecreased.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		}),
		prismaClient.eventLogs_StakerDelegated.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		}),
		prismaClient.eventLogs_StakerUndelegated.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		}),
		prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.findFirst({
			select: { blockTime: true },
			orderBy: { blockTime: 'asc' }
		})
	])

	const timestamps = [
		firstLogOsInc?.blockTime,
		firstLogOsDec?.blockTime,
		firstLogStakerInc?.blockTime,
		firstLogStakerDec?.blockTime,
		firstLogOperatorRegStatus?.blockTime
	].filter((timestamp): timestamp is Date => timestamp !== null && timestamp !== undefined)

	return timestamps.length > 0 ? new Date(Math.min(...timestamps.map((t) => t.getTime()))) : null
}

/**
 * Get latest metrics per avs
 *
 * @returns
 */
async function getLatestMetricsPerAvs(): Promise<ILastAvsMetrics> {
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerAvs = await prismaClient.metricAvsUnit.groupBy({
			by: ['avsAddress'],
			_max: {
				timestamp: true
			}
		})

		const metrics = await prismaClient.metricAvsUnit.findMany({
			where: {
				OR: lastMetricsPerAvs.map((metric) => ({
					avsAddress: metric.avsAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricAvsUnitWhereInput[]
			},
			orderBy: {
				avsAddress: 'asc'
			}
		})

		return metrics
			? (new Map(metrics.map((metric) => [metric.avsAddress, metric])) as ILastAvsMetrics)
			: new Map()
	} catch {}

	return new Map()
}

/**
 * Get latest metrics per avs strategy
 *
 * @returns
 */
async function getLatestMetricsPerAvsStrategy(): Promise<ILastAvsStrategyMetrics> {
	const groupedMetrics: ILastAvsStrategyMetrics = new Map()
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerAvsStrategy = await prismaClient.metricAvsStrategyUnit.groupBy({
			by: ['avsAddress', 'strategyAddress'],
			_max: {
				timestamp: true
			}
		})

		const metrics = await prismaClient.metricAvsStrategyUnit.findMany({
			where: {
				OR: lastMetricsPerAvsStrategy.map((metric) => ({
					avsAddress: metric.avsAddress,
					strategyAddress: metric.strategyAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricAvsStrategyUnitWhereInput[]
			},
			orderBy: {
				avsAddress: 'asc'
			}
		})

		for (const metric of metrics) {
			const { avsAddress, strategyAddress } = metric

			if (!groupedMetrics.has(avsAddress)) {
				groupedMetrics.set(avsAddress, new Map())
			}

			const avsMetrics = groupedMetrics.get(avsAddress)

			const metricWithoutId: ILastAvsStrategyMetric = {
				avsAddress: metric.avsAddress,
				strategyAddress: metric.strategyAddress,
				tvl: metric.tvl,
				changeTvl: metric.changeTvl,
				timestamp: metric.timestamp
			}

			avsMetrics.set(strategyAddress, metricWithoutId)
		}
	} catch {}

	return groupedMetrics
}

/**
 * Get latest metrics per operator
 *
 * @returns
 */
async function getLatestMetricsPerOperator(): Promise<ILastOperatorMetrics> {
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerOperator = await prismaClient.metricOperatorUnit.groupBy({
			by: ['operatorAddress'],
			_max: {
				timestamp: true
			}
		})

		const metrics = await prismaClient.metricOperatorUnit.findMany({
			where: {
				OR: lastMetricsPerOperator.map((metric) => ({
					operatorAddress: metric.operatorAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricOperatorUnitWhereInput[]
			},
			orderBy: {
				operatorAddress: 'asc'
			}
		})

		return metrics
			? (new Map(metrics.map((metric) => [metric.operatorAddress, metric])) as ILastOperatorMetrics)
			: new Map()
	} catch {}

	return new Map()
}

/**
 * Get latest metrics per operator strategy
 *
 * @returns
 */
async function getLatestMetricsPerOperatorStrategy(): Promise<ILastOperatorStrategyMetrics> {
	const groupedMetrics: ILastOperatorStrategyMetrics = new Map()
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerOperatorStrategy = await prismaClient.metricOperatorStrategyUnit.groupBy({
			by: ['operatorAddress', 'strategyAddress'],
			_max: {
				timestamp: true
			}
		})

		const metrics = await prismaClient.metricOperatorStrategyUnit.findMany({
			where: {
				OR: lastMetricsPerOperatorStrategy.map((metric) => ({
					operatorAddress: metric.operatorAddress,
					strategyAddress: metric.strategyAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricOperatorStrategyUnitWhereInput[]
			},
			orderBy: {
				operatorAddress: 'asc'
			}
		})

		for (const metric of metrics) {
			const { operatorAddress, strategyAddress } = metric

			if (!groupedMetrics.has(operatorAddress)) {
				groupedMetrics.set(operatorAddress, new Map())
			}

			const operatorMetrics = groupedMetrics.get(operatorAddress)

			const metricWithoutId: ILastOperatorStrategyMetric = {
				operatorAddress: metric.operatorAddress,
				strategyAddress: metric.strategyAddress,
				tvl: metric.tvl,
				changeTvl: metric.changeTvl,
				timestamp: metric.timestamp
			}

			operatorMetrics.set(strategyAddress, metricWithoutId)
		}
	} catch {}

	return groupedMetrics
}

/**
 * Return a set of operators avs
 */
async function getAvsOperatorsState(to?: Date): Promise<IMap<string, Set<string>>> {
	const prismaClient = getPrismaClient()
	const avsOperators: IMap<string, Set<string>> = new Map()

	try {
		const operatorRegStatusLogs =
			await prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.findMany({
				where: to ? { blockTime: { lte: to } } : {},
				orderBy: [{ blockNumber: 'asc' }, { transactionIndex: 'asc' }]
			})

		for (const log of operatorRegStatusLogs) {
			const operatorAddress = log.operator.toLowerCase()
			const avsAddress = log.avs.toLowerCase()
			const status = Number(log.status)

			if (!avsOperators.has(avsAddress)) {
				avsOperators.set(avsAddress, new Set())
			}

			if (status === 1) {
				avsOperators.get(avsAddress).add(operatorAddress)
			} else {
				avsOperators.get(avsAddress).delete(operatorAddress)
			}
		}
	} catch {}

	return avsOperators
}

/**
 * Get avs operators restaked strategies
 *
 * @returns
 */
async function getAvsOperatorsRestakedStrategies(): Promise<IMap<string, Map<string, string[]>>> {
	const prismaClient = getPrismaClient()
	const map: IMap<string, Map<string, string[]>> = new Map()

	const avsOperatorsList = await prismaClient.avsOperator.findMany({
		select: {
			avsAddress: true,
			operatorAddress: true,
			restakedStrategies: true
		}
	})

	for (const avsOperator of avsOperatorsList) {
		const { avsAddress, operatorAddress, restakedStrategies } = avsOperator

		if (!map.has(avsAddress)) {
			map.set(avsAddress, new Map())
		}

		map.get(avsAddress)?.set(operatorAddress, restakedStrategies)
	}

	return map
}

/**
 * Get operator avs count
 *
 * @param avsOperatorsMap
 * @param operatorAddress
 * @returns
 */
function getOperatorAvsCount(
	avsOperatorsMap: Map<string, Set<string>>,
	operatorAddress: string
): number {
	let count = 0

	for (const avsSet of avsOperatorsMap.values()) {
		if (avsSet.has(operatorAddress.toLowerCase())) {
			count++
		}
	}

	return count
}
