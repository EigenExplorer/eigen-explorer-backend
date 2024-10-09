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

const blockSyncKey = 'lastSyncedTimestamp_metrics_restaking'
const BATCH_DAYS = 30

// Define the type for our log entries
type ILastOperatorMetric = Omit<prisma.MetricOperatorUnit, 'id'>
type ILastAvsMetric = Omit<prisma.MetricAvsUnit, 'id'>
type ILastOperatorStrategyMetric = Omit<
	prisma.MetricOperatorStrategyUnit,
	'id'
>
type ILastAvsStrategyMetric = Omit<prisma.MetricAvsStrategyUnit, 'id'>
type ILastOperatorMetrics = IMap<string, ILastOperatorMetric>
type ILastAvsMetrics = IMap<string, ILastAvsMetric>
type ILastOperatorStrategyMetrics = IMap<
	string,
	IMap<string, ILastOperatorStrategyMetric>
>
type ILastAvsStrategyMetrics = IMap<
	string,
	IMap<string, ILastAvsStrategyMetric>
>
type LogEntry = {
	blockTime: Date
	blockNumber: bigint
	transactionIndex: number
	type: string

	operator: string
	strategy: string
	shares: string

	avs: string
	status: number
}

export async function seedMetricsRestaking(type: 'full' | 'incremental' = 'incremental') {
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
		console.log(
			`[In Sync] [Metrics] Restaking Daily from: ${startDate} to: ${endDate}`
		)
		return
	}

	console.log('[Prep] Metric Restaking ...')

	// Clear previous data
	if (clearPrev) {
		await Promise.all([
			prismaClient.metricOperatorUnit.deleteMany(),
			prismaClient.metricOperatorStrategyUnit.deleteMany(),
			prismaClient.metricAvsUnit.deleteMany(),
			prismaClient.metricAvsStrategyUnit.deleteMany()
		])
	}

	// Fetch constant data and last metrics
	const [
		sharesToUnderlyingList,
		lastOperatorMetrics,
		lastOperatorStrategyMetrics,
		lastAvsMetrics,
		lastAvsStrategyMetrics
	] = await Promise.all([
		await prismaClient.strategies.findMany({
			select: { sharesToUnderlying: true, address: true }
		}),
		getLatestMetricsPerOperator(),
		getLatestMetricsPerOperatorStrategy(),
		getLatestMetricsPerAvs(),
		getLatestMetricsPerAvsStrategy()
	])

	const avsOperatorsState = await getAvsOperatorsState(startDate)

	// Process logs in batches
	const [
		operatorMetrics,
		operatorStrategyMetrics,
		avsMetrics,
		avsStrategyMetrics
	] = await processLogsInBatches(
		startDate,
		endDate,
		lastOperatorMetrics,
		lastOperatorStrategyMetrics,
		lastAvsMetrics,
		lastAvsStrategyMetrics,
		sharesToUnderlyingList,
		avsOperatorsState
	)

	// Update data
	const dbTransactions = [
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
	]

	await bulkUpdateDbTransactions(
		dbTransactions,
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
 * @param lastOperatorMetrics
 * @param lastOperatorStrategyMetrics
 * @param lastStrategyMetrics
 * @param sharesToUnderlyingList
 * @returns
 */
async function processLogsInBatches(
	startDate: Date,
	endDate: Date,
	lastOperatorMetrics: ILastOperatorMetrics,
	lastOperatorStrategyMetrics: ILastOperatorStrategyMetrics,
	lastAvsMetrics: ILastAvsMetrics,
	lastAvsStrategyMetrics: ILastAvsStrategyMetrics,
	sharesToUnderlyingList: { sharesToUnderlying: string; address: string }[],
	avsOperatorsState: IMap<string, Set<string>>
): Promise<
	[
		ILastOperatorMetric[],
		ILastOperatorStrategyMetric[],
		ILastAvsMetric[],
		ILastAvsStrategyMetric[]
	]
> {
	const operatorMetrics: ILastOperatorMetric[] = []
	const operatorStrategyMetrics: ILastOperatorStrategyMetric[] = []
	const avsMetrics: ILastAvsMetric[] = []
	const avsStrategyMetrics: ILastAvsStrategyMetric[] = []
	const sharesToUnderlyingMap = new Map(
		sharesToUnderlyingList.map((s) => [s.address, BigInt(s.sharesToUnderlying)])
	)

	for (
		let currentDate = setToStartOfDay(startDate);
		currentDate < setToStartOfDay(endDate);
		currentDate = new Date(
			currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS
		)
	) {
		const batchEndDate = new Date(
			Math.min(
				currentDate.getTime() + 24 * 60 * 60 * 1000 * BATCH_DAYS,
				endDate.getTime()
			)
		)

		const batchLogs = await fetchOrderedLogs(currentDate, batchEndDate)

		await loopThroughDates(
			currentDate,
			batchEndDate,
			async (fromHour, toHour) => {
				const [
					operatorTvlRecords,
					operatorStrategyRecords,
					avsTvlRecords,
					avsStrategyRecords
				] = await loopTick(
					fromHour,
					toHour,
					batchLogs,
					lastOperatorMetrics,
					lastOperatorStrategyMetrics,
					lastAvsMetrics,
					lastAvsStrategyMetrics,
					sharesToUnderlyingMap,
					avsOperatorsState
				)

				operatorMetrics.push(...operatorTvlRecords)
				operatorStrategyMetrics.push(...operatorStrategyRecords)
				avsMetrics.push(...avsTvlRecords)
				avsStrategyMetrics.push(...avsStrategyRecords)
			},
			'daily'
		)

		console.log(
			`[Batch] Metric Restaking from: ${currentDate.toISOString()} to: ${batchEndDate.toISOString()} count: ${
				operatorMetrics.length
			}`
		)
	}

	return [
		operatorMetrics,
		operatorStrategyMetrics,
		avsMetrics,
		avsStrategyMetrics
	]
}

/**
 * Loop through each tick
 *
 * @param fromHour
 * @param toHour
 * @param orderedLogs
 * @param lastOperatorMetrics
 * @param lastOperatorStrategyMetrics
 * @param lastStrategyMetrics
 * @param sharesToUnderlyingMap
 * @returns
 */
async function loopTick(
	fromDate: Date,
	toDate: Date,
	orderedLogs: LogEntry[],
	lastOperatorMetrics: ILastOperatorMetrics,
	lastOperatorStrategyMetrics: ILastOperatorStrategyMetrics,
	lastAvsMetrics: ILastAvsMetrics,
	lastAvsStrategyMetrics: ILastAvsStrategyMetrics,
	sharesToUnderlyingMap: Map<string, bigint>,
	avsOperatorsState: IMap<string, Set<string>>
): Promise<
	[
		ILastOperatorMetric[],
		ILastOperatorStrategyMetric[],
		ILastAvsMetric[],
		ILastAvsStrategyMetric[]
	]
> {
	const operatorAddresses = new Set<string>()
	const strategyAddresses = new Set<string>()
	const operatorStakers = new Map<string, number>()
	const operatorStrategyShares = new Map<string, Map<string, bigint>>()
	const strategyShares = new Map<string, bigint>()
	const operatorTvlRecords: ILastOperatorMetric[] = []
	const avsTvlRecords: ILastAvsMetric[] = []
	const operatorStrategyTvlRecords: ILastOperatorStrategyMetric[] = []
	const avsStrategyTvlRecords: ILastAvsStrategyMetric[] = []

	// Filter logs
	const logs = orderedLogs.filter(
		(ol) => ol.blockTime > fromDate && ol.blockTime <= toDate
	)

	for (const ol of logs) {
		const operatorAddress = ol.operator.toLowerCase()
		operatorAddresses.add(operatorAddress)

		if (
			ol.type === 'OperatorSharesIncreased' ||
			ol.type === 'OperatorSharesDecreased'
		) {
			const shares = BigInt(ol.shares)
			const strategyAddress = ol.strategy.toLowerCase()
			strategyAddresses.add(strategyAddress)

			const operatorShares =
				operatorStrategyShares.get(operatorAddress) || new Map()
			operatorStrategyShares.set(operatorAddress, operatorShares)

			const currentShares = operatorShares.get(strategyAddress) || 0n
			const newShares =
				ol.type === 'OperatorSharesIncreased'
					? currentShares + shares
					: currentShares - shares
			operatorShares.set(strategyAddress, newShares)

			const currentStrategyShares = strategyShares.get(strategyAddress) || 0n
			strategyShares.set(
				strategyAddress,
				ol.type === 'OperatorSharesIncreased'
					? currentStrategyShares + shares
					: currentStrategyShares - shares
			)
		} else if (
			ol.type === 'StakerDelegated' ||
			ol.type === 'StakerUndelegated'
		) {
			const currentStakers = operatorStakers.get(operatorAddress) || 0
			operatorStakers.set(
				operatorAddress,
				ol.type === 'StakerDelegated' ? currentStakers + 1 : currentStakers - 1
			)
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
		const changeStakers = operatorStakers.get(operatorAddress) || 0
		const totalAvs = getOperatorAvsCount(avsOperatorsState, operatorAddress)
		const changeAvs = totalAvs - lastOperatorMetric.totalAvs
		const totalStakers = lastOperatorMetric.totalStakers + changeStakers

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

			const sharesToUnderlying = sharesToUnderlyingMap.get(strategyAddress)
			if (sharesToUnderlying) {
				changeTvl += Number(shares * sharesToUnderlying) / 1e36
			}

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
				tvl: new prisma.Prisma.Decimal(
					Number(lastOperatorStrategyMetric.tvl) + changeTvl
				),
				changeTvl: new prisma.Prisma.Decimal(changeTvl),
				timestamp: toDate
			}

			lastOperatorStrategyMetrics
				.get(operatorAddress)
				.set(strategyAddress, newOperatorStrategyMetric)

			operatorStrategyTvlRecords.push(newOperatorStrategyMetric)
		}
	}

	for (const [avsAddress, operatorAddresses] of avsOperatorsState) {
		// Add AVS TVL Records Here

		let totalStakers = 0
		let totalOperators = 0
		const totalTvl: IMap<string, number> = new Map()

		for (const operatorAddress of operatorAddresses) {
			totalOperators++

			const lastOperatorMetric = lastOperatorMetrics.get(operatorAddress)
			if (lastOperatorMetric) {
				totalStakers += lastOperatorMetric.totalStakers
			}

			const lastOperatorStrategyMetric =
				lastOperatorStrategyMetrics.get(operatorAddress)

			if (lastOperatorStrategyMetric) {
				for (const [
					strategyAddress,
					strategyMetric
				] of lastOperatorStrategyMetric) {
					if (!totalTvl.has(strategyAddress)) {
						totalTvl.set(strategyAddress, 0)
					}

					totalTvl.set(
						strategyAddress,
						totalTvl.get(strategyAddress) + Number(strategyMetric.tvl)
					)
				}
			}
		}

		const lastMetric = lastAvsMetrics.get(avsAddress) || {
			avsAddress,
			totalStakers: 0,
			changeStakers: 0,
			totalOperators: 0,
			changeOperators: 0,
			timestamp: toDate
		}

		if (
			lastMetric.totalStakers !== totalStakers ||
			lastMetric.totalOperators !== totalOperators
		) {
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

		for (const [strategyAddress, tvl] of totalTvl) {
			if (!lastAvsStrategyMetrics.has(avsAddress)) {
				lastAvsStrategyMetrics.set(avsAddress, new Map())
			}

			const lastAvsStrategyMetric = lastAvsStrategyMetrics
				.get(avsAddress)
				.get(strategyAddress) || {
				avsAddress,
				strategyAddress,
				tvl: new prisma.Prisma.Decimal(0),
				changeTvl: new prisma.Prisma.Decimal(0),
				timestamp: toDate
			}

			if (Number(lastAvsStrategyMetric.tvl) !== tvl) {
				const newAvsStrategyMetric = {
					...lastAvsStrategyMetric,
					tvl: new prisma.Prisma.Decimal(tvl),
					changeTvl: new prisma.Prisma.Decimal(tvl).minus(
						lastAvsStrategyMetric.tvl
					),
					timestamp: toDate
				}

				lastAvsStrategyMetrics
					.get(avsAddress)
					.set(strategyAddress, newAvsStrategyMetric)

				avsStrategyTvlRecords.push(newAvsStrategyMetric)
			}
		}
	}

	return [
		operatorTvlRecords,
		operatorStrategyTvlRecords,
		avsTvlRecords,
		avsStrategyTvlRecords
	]
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
	const query = { blockTime: { gt: from, lte: to } }

	const [
		logs_osInc,
		logs_osDec,
		logs_stakersInc,
		logs_stakersDec,
		logs_operatorRegStatus
	] = await Promise.all([
		prismaClient.eventLogs_OperatorSharesIncreased.findMany({ where: query }),
		prismaClient.eventLogs_OperatorSharesDecreased.findMany({ where: query }),
		prismaClient.eventLogs_StakerDelegated.findMany({ where: query }),
		prismaClient.eventLogs_StakerUndelegated.findMany({ where: query }),
		prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.findMany({
			where: query
		})
	])

	const orderedLogs = [
		...logs_osInc.map((l) => ({ ...l, type: 'OperatorSharesIncreased' })),
		...logs_osDec.map((l) => ({ ...l, type: 'OperatorSharesDecreased' })),
		...logs_stakersInc.map((l) => ({ ...l, type: 'StakerDelegated' })),
		...logs_stakersDec.map((l) => ({ ...l, type: 'StakerUndelegated' })),
		...logs_operatorRegStatus.map((l) => ({
			...l,
			type: 'OperatorAVSRegistrationStatusUpdated'
		}))
	].sort(
		(a, b) =>
			Number(a.blockNumber - b.blockNumber) ||
			a.transactionIndex - b.transactionIndex
	)

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
	].filter(
		(timestamp): timestamp is Date =>
			timestamp !== null && timestamp !== undefined
	)

	return timestamps.length > 0
		? new Date(Math.min(...timestamps.map((t) => t.getTime())))
		: null
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
			? new Map(metrics.map((metric) => [metric.avsAddress, metric]))
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
		const lastMetricsPerAvsStrategy =
			await prismaClient.metricAvsStrategyUnit.groupBy({
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
		const lastMetricsPerOperator =
			await prismaClient.metricOperatorUnit.groupBy({
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
			? new Map(metrics.map((metric) => [metric.operatorAddress, metric]))
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
		const lastMetricsPerOperatorStrategy =
			await prismaClient.metricOperatorStrategyUnit.groupBy({
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
async function getAvsOperatorsState(
	to?: Date
): Promise<IMap<string, Set<string>>> {
	const prismaClient = getPrismaClient()
	const avsOperators: IMap<string, Set<string>> = new Map()

	try {
		const operatorRegStatusLogs =
			await prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.findMany(
				{
					where: to ? { blockTime: { lte: to } } : {},
					orderBy: [{ blockNumber: 'asc' }, { transactionIndex: 'asc' }]
				}
			)

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
