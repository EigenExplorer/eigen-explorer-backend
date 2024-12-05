import prisma from './prismaClient'
import { getStrategiesWithShareUnderlying } from './strategyShares'
import { fetchTokenPrices } from './tokenPrices'
import Prisma from '@prisma/client'

type EventRecord = {
	type: string
	tx: string
	blockNumber: number
	blockTime: Date
	args: EventArgs
}

type UnderlyingTokenDetails = {
	underlyingToken?: string
	underlyingValue?: number
	ethValue?: number
}

type StrategyData = {
	strategy: string
	shares: number
} & UnderlyingTokenDetails

export type EventArgs = DelegationArgs | DepositArgs | WithdrawalArgs | RewardArgs

type DelegationArgs = {
	operator?: string
	staker?: string
	strategy?: string
	shares?: number
} & UnderlyingTokenDetails

type DepositArgs = {
	token: string
	strategy: string
	shares: number
	staker?: string
} & UnderlyingTokenDetails

type WithdrawalArgs = {
	withdrawalRoot: string
	staker?: string
	delegatedTo?: string
	withdrawer?: string
	nonce?: number
	startBlock?: number
	strategies?: StrategyData[]
}

type RewardArgs = {
	avs?: string
	submissionNonce: number
	rewardsSubmissionHash: string
	rewardsSubmissionToken: string
	rewardsSubmissionAmount: string
	rewardsSubmissionStartTimeStamp: number
	rewardsSubmissionDuration: number
	strategies: {
		strategy: string
		multiplier: string
		amount?: string
		amountEthValue?: number
	}[]
	ethValue?: number
}

/**
 * Utility function to fetch delegation events.
 *
 * @param operatorAddress
 * @param stakerAddress
 * @param type
 * @param strategyAddress
 * @param txHash
 * @param startAt
 * @param endAt
 * @param withTokenData
 * @param withEthValue
 * @param skip
 * @param take
 * @returns
 */
export async function fetchDelegationEvents({
	operatorAddress,
	stakerAddress,
	type,
	strategyAddress,
	txHash,
	startAt,
	endAt,
	withTokenData,
	withEthValue,
	skip,
	take
}: {
	operatorAddress?: string
	stakerAddress?: string
	type?: string
	strategyAddress?: string
	txHash?: string
	startAt?: string
	endAt?: string
	withTokenData: boolean
	withEthValue: boolean
	skip: number
	take: number
}): Promise<{ eventRecords: EventRecord[]; total: number }> {
	const eventTypes = strategyAddress
		? ['SHARES_INCREASED', 'SHARES_DECREASED']
		: ['SHARES_INCREASED', 'SHARES_DECREASED', 'DELEGATION', 'UNDELEGATION']

	const typesToFetch = type ? [type] : eventTypes

	const baseFilterQuery = {
		...(strategyAddress && {
			strategy: {
				contains: strategyAddress,
				mode: 'insensitive'
			}
		}),
		...(operatorAddress && {
			operator: {
				contains: operatorAddress,
				mode: 'insensitive'
			}
		}),
		...(stakerAddress && {
			staker: {
				contains: stakerAddress,
				mode: 'insensitive'
			}
		}),
		...(txHash && {
			transactionHash: {
				contains: txHash,
				mode: 'insensitive'
			}
		}),
		blockTime: {
			gte: new Date(startAt as string),
			...(endAt ? { lte: new Date(endAt as string) } : {})
		}
	}

	const results = await Promise.all(
		typesToFetch.map((eventType) => fetchAndMapEvents(eventType, baseFilterQuery, 0, skip + take))
	)

	const allEvents = results.flatMap((result) => result.eventRecords)
	const totalCount = results.reduce((sum, result) => sum + result.eventCount, 0)

	const sortedEvents = sortEvents(allEvents)
	const paginatedEvents = sortedEvents.slice(skip, skip + take)

	const enrichedEvents = await enrichEventsWithTokenData(
		paginatedEvents,
		withTokenData,
		withEthValue
	)

	return {
		eventRecords: enrichedEvents,
		total: totalCount
	}
}

/**
 * Utility function to fetch deposit events.
 *
 * @param stakerAddress
 * @param tokenAddress
 * @param strategyAddress
 * @param txHash
 * @param startAt
 * @param endAt
 * @param withTokenData
 * @param withEthValue
 * @param skip
 * @param take
 * @returns
 */
export async function fetchDepositEvents({
	stakerAddress,
	tokenAddress,
	strategyAddress,
	txHash,
	startAt,
	endAt,
	withTokenData,
	withEthValue,
	skip,
	take
}: {
	stakerAddress?: string
	tokenAddress?: string
	strategyAddress?: string
	txHash?: string
	startAt?: string
	endAt?: string
	withTokenData: boolean
	withEthValue: boolean
	skip: number
	take: number
}): Promise<{ eventRecords: EventRecord[]; total: number }> {
	const baseFilterQuery = {
		...(stakerAddress && {
			staker: {
				contains: stakerAddress,
				mode: 'insensitive'
			}
		}),
		...(tokenAddress && {
			token: {
				contains: tokenAddress,
				mode: 'insensitive'
			}
		}),
		...(strategyAddress && {
			strategy: {
				contains: strategyAddress,
				mode: 'insensitive'
			}
		}),
		...(txHash && {
			transactionHash: {
				contains: txHash,
				mode: 'insensitive'
			}
		}),
		blockTime: {
			gte: new Date(startAt as string),
			...(endAt ? { lte: new Date(endAt as string) } : {})
		}
	}

	const results = await fetchAndMapEvents('DEPOSIT', baseFilterQuery, skip, take)

	const enrichedEvents = await enrichEventsWithTokenData(
		results.eventRecords,
		withTokenData,
		withEthValue
	)

	return {
		eventRecords: enrichedEvents,
		total: results.eventCount
	}
}

/**
 * Utility function to fetch rewards events.
 *
 * @param avsAddress
 * @param rewardsSubmissionToken
 * @param rewardsSubmissionHash
 * @param startAt
 * @param endAt
 * @param withIndividualAmount
 * @param withEthValue
 * @param skip
 * @param take
 * @returns
 */
export async function fetchRewardsEvents({
	avsAddress,
	rewardsSubmissionToken,
	rewardsSubmissionHash,
	startAt,
	endAt,
	withIndividualAmount,
	withEthValue,
	skip,
	take
}: {
	withEthValue: boolean
	withIndividualAmount: boolean
	skip: number
	take: number
	avsAddress?: string
	rewardsSubmissionToken?: string
	rewardsSubmissionHash?: string
	startAt?: string
	endAt?: string
}): Promise<{ eventRecords: EventRecord[]; total: number }> {
	const baseFilterQuery = {
		...(avsAddress && { avs: { contains: avsAddress, mode: 'insensitive' } }),
		...(rewardsSubmissionToken && {
			rewardsSubmission_token: { contains: rewardsSubmissionToken, mode: 'insensitive' }
		}),
		...(rewardsSubmissionHash && {
			rewardsSubmissionHash: { contains: rewardsSubmissionHash, mode: 'insensitive' }
		}),
		blockTime: {
			gte: new Date(startAt as string),
			...(endAt ? { lte: new Date(endAt as string) } : {})
		}
	}

	const { eventRecords: rawEventRecords, eventCount: totalRecords } = await fetchAndMapEvents(
		'REWARDS',
		baseFilterQuery,
		skip,
		take
	)

	const tokenPrices = withEthValue ? await fetchTokenPrices() : []

	const enrichedEvents = rawEventRecords.map((event) => {
		const args = event.args as RewardArgs
		const totalAmount = new Prisma.Prisma.Decimal(args.rewardsSubmissionAmount)

		const tokenPrice = tokenPrices.find(
			(tp) => tp.address.toLowerCase() === args.rewardsSubmissionToken.toLowerCase()
		)

		const ethPrice = tokenPrice?.ethPrice ?? 0
		const decimals = tokenPrice?.decimals ?? 18

		const ethValue = withEthValue
			? totalAmount
					.div(new Prisma.Prisma.Decimal(10).pow(decimals))
					.mul(new Prisma.Prisma.Decimal(ethPrice))
					.toNumber()
			: undefined

		if (withIndividualAmount) {
			const strategies = args.strategies as Array<{ strategy: string; multiplier: string }>

			const totalMultiplier = strategies
				.map((s) => new Prisma.Prisma.Decimal(s.multiplier))
				.reduce((acc, m) => acc.add(m), new Prisma.Prisma.Decimal(0))

			args.strategies = strategies.map((strategy) => {
				const multiplier = new Prisma.Prisma.Decimal(strategy.multiplier)
				const individualAmount = totalAmount
					.mul(multiplier)
					.div(totalMultiplier)
					.toNumber()
					.toFixed(0)

				const amountEthValue = withEthValue
					? new Prisma.Prisma.Decimal(individualAmount)
							.div(new Prisma.Prisma.Decimal(10).pow(decimals))
							.mul(new Prisma.Prisma.Decimal(ethPrice))
							.toNumber()
					: undefined

				return {
					...strategy,
					amount: individualAmount,
					...(withEthValue && { amountEthValue })
				}
			})
		}

		return {
			...event,
			...(withEthValue && { ethValue })
		}
	})

	return {
		eventRecords: enrichedEvents,
		total: totalRecords
	}
}

/**
 * Utility function to fetch all withdrawal events.
 *
 * @param type
 * @param txHash
 * @param startAt
 * @param endAt
 * @param withdrawalRoot
 * @param delegatedTo
 * @param withdrawer
 * @param skip
 * @param take
 * @param withTokenData
 * @param withEthValue
 */
export async function fetchGlobalWithdrawalEvents({
	type,
	txHash,
	startAt,
	endAt,
	withdrawalRoot,
	delegatedTo,
	withdrawer,
	skip,
	take,
	withTokenData,
	withEthValue
}: {
	type?: string
	txHash?: string
	startAt?: string
	endAt?: string
	withdrawalRoot?: string
	delegatedTo?: string
	withdrawer?: string
	skip: number
	take: number
	withTokenData: boolean
	withEthValue: boolean
}): Promise<{ eventRecords: EventRecord[]; total: number }> {
	const eventTypes =
		delegatedTo || withdrawer
			? ['WITHDRAWAL_QUEUED']
			: ['WITHDRAWAL_QUEUED', 'WITHDRAWAL_COMPLETED']

	const typesToFetch = type ? [type] : eventTypes

	const baseFilterQuery = {
		...(withdrawalRoot && {
			withdrawalRoot: {
				contains: withdrawalRoot,
				mode: 'insensitive'
			}
		}),
		...(delegatedTo && {
			delegatedTo: {
				contains: delegatedTo,
				mode: 'insensitive'
			}
		}),
		...(withdrawer && {
			withdrawer: {
				contains: withdrawer,
				mode: 'insensitive'
			}
		}),
		...(txHash && {
			transactionHash: {
				contains: txHash,
				mode: 'insensitive'
			}
		}),
		blockTime: {
			gte: new Date(startAt as string),
			...(endAt ? { lte: new Date(endAt as string) } : {})
		}
	}

	const results = await Promise.all(
		typesToFetch.map((eventType) => fetchAndMapEvents(eventType, baseFilterQuery, 0, skip + take))
	)

	const allEvents = results.flatMap((result) => result.eventRecords)
	const totalCount = results.reduce((sum, result) => sum + result.eventCount, 0)

	const sortedEvents = sortEvents(allEvents)
	const paginatedEvents = sortedEvents.slice(skip, skip + take)

	const enrichedEvents = await enrichEventsWithTokenData(
		paginatedEvents,
		withTokenData,
		withEthValue
	)

	return {
		eventRecords: enrichedEvents,
		total: totalCount
	}
}

/**
 * Utility function to fetch withdrawal events for a specific staker.
 *
 * @param stakerAddress
 * @param type
 * @param txHash
 * @param startAt
 * @param endAt
 * @param withdrawalRoot
 * @param delegatedTo
 * @param withdrawer
 * @param skip
 * @param take
 * @param withTokenData
 * @param withEthValue
 */
export async function fetchStakerWithdrawalEvents({
	stakerAddress,
	type,
	txHash,
	startAt,
	endAt,
	withdrawalRoot,
	delegatedTo,
	withdrawer,
	skip,
	take,
	withTokenData,
	withEthValue
}: {
	stakerAddress: string
	type?: string
	txHash?: string
	startAt?: string
	endAt?: string
	withdrawalRoot?: string
	delegatedTo?: string
	withdrawer?: string
	skip: number
	take: number
	withTokenData: boolean
	withEthValue: boolean
}): Promise<{ eventRecords: EventRecord[]; total: number }> {
	let queuedEvents: EventRecord[] = []
	let completedEvents: EventRecord[] = []

	const queuedFilterQuery = {
		staker: {
			contains: stakerAddress,
			mode: 'insensitive'
		},
		...(withdrawalRoot && {
			withdrawalRoot: {
				contains: withdrawalRoot,
				mode: 'insensitive'
			}
		}),
		...(delegatedTo && {
			delegatedTo: {
				contains: delegatedTo,
				mode: 'insensitive'
			}
		}),
		...(withdrawer && {
			withdrawer: {
				contains: withdrawer,
				mode: 'insensitive'
			}
		}),
		...(txHash && {
			transactionHash: {
				contains: txHash,
				mode: 'insensitive'
			}
		})
	}

	const completedFilterQuery = {
		...(withdrawalRoot && {
			withdrawalRoot: {
				contains: withdrawalRoot,
				mode: 'insensitive'
			}
		}),
		...(txHash && {
			transactionHash: {
				contains: txHash,
				mode: 'insensitive'
			}
		}),
		blockTime: {
			gte: new Date(startAt as string),
			...(endAt ? { lte: new Date(endAt as string) } : {})
		}
	}

	const queuedResult = await fetchAndMapEvents('WITHDRAWAL_QUEUED', queuedFilterQuery, 0, undefined)
	const filteredQueuedEvents = queuedResult.eventRecords.filter((event) => {
		const blockTime = new Date(event.blockTime)
		return (!startAt || blockTime >= new Date(startAt)) && (!endAt || blockTime <= new Date(endAt))
	})

	if (type === 'WITHDRAWAL_QUEUED') {
		const paginatedEvents = filteredQueuedEvents.slice(skip, skip + take)
		const enrichedEvents = await enrichEventsWithTokenData(
			paginatedEvents,
			withTokenData,
			withEthValue
		)
		return {
			eventRecords: enrichedEvents,
			total: filteredQueuedEvents.length
		}
	}

	queuedEvents = queuedResult.eventRecords
	if (txHash || withdrawalRoot) {
		const completedResult = await fetchAndMapEvents(
			'WITHDRAWAL_COMPLETED',
			completedFilterQuery,
			0,
			undefined
		)
		completedEvents = completedResult.eventRecords
	} else {
		const withdrawalRoots = queuedEvents
			.map((event) => (event.args as WithdrawalArgs).withdrawalRoot)
			.filter((root): root is string => root !== undefined)
		if (withdrawalRoots && withdrawalRoots.length) {
			const completedResult = await fetchAndMapEvents(
				'WITHDRAWAL_COMPLETED',
				{
					withdrawalRoot: { in: withdrawalRoots },
					blockTime: {
						gte: new Date(startAt as string),
						...(endAt ? { lte: new Date(endAt as string) } : {})
					}
				},
				0,
				undefined
			)
			completedEvents = completedResult.eventRecords
		}
	}
	const allEvents =
		type === 'WITHDRAWAL_COMPLETED'
			? completedEvents
			: [...filteredQueuedEvents, ...completedEvents]

	const sortedEvents = sortEvents(allEvents)
	const paginatedEvents = sortedEvents.slice(skip, skip + take)

	const enrichedEvents = await enrichEventsWithTokenData(
		paginatedEvents,
		withTokenData,
		withEthValue
	)

	return {
		eventRecords: enrichedEvents,
		total: allEvents.length
	}
}

// Helper Functions
const maxDuration = 30 * 24 * 60 * 60 * 1000 // 30 days
const defaultDuration = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Validates that the given time range doesn't exceed the max allowed duration.
 *
 * @param startAt
 * @param endAt
 * @returns
 */
export const validateDateRange = (startAt: string, endAt: string) => {
	const start = new Date(startAt)
	const end = new Date(endAt || new Date())
	const durationMs = end.getTime() - start.getTime()
	return durationMs <= maxDuration
}

/**
 * Helper function to get default dates if not provided.
 * Default to last 7 days
 *
 * @param startAt
 * @param endAt
 * @returns
 */
export const getValidatedDates = (startAt?: string, endAt?: string) => {
	const now = new Date()

	if (!startAt && !endAt) {
		return {
			startAt: new Date(now.getTime() - defaultDuration).toISOString(),
			endAt: null
		}
	}

	if (startAt && !endAt) {
		const start = new Date(startAt)
		return {
			startAt,
			endAt: new Date(Math.min(start.getTime() + defaultDuration, now.getTime())).toISOString()
		}
	}

	if (!startAt && endAt) {
		const end = new Date(endAt)
		return {
			startAt: new Date(end.getTime() - defaultDuration).toISOString(),
			endAt
		}
	}

	return { startAt, endAt }
}

/**
 * Enrich events with `withTokenData` and `withEthValue` logic.
 *
 * @param events
 * @param withTokenData
 * @param withEthValue
 * @returns
 */
async function enrichEventsWithTokenData(
	events: EventRecord[],
	withTokenData: boolean,
	withEthValue: boolean
): Promise<EventRecord[]> {
	if (!withTokenData) {
		return events
	}

	return Promise.all(
		events.map(async (event) => {
			const detailedStrategies: StrategyData[] = []
			let underlyingToken: string | undefined
			let underlyingValue: number | undefined
			let ethValue: number | undefined

			if (
				event.type === 'WITHDRAWAL_QUEUED' &&
				'strategies' in event.args &&
				event.args.strategies
			) {
				for (const strategy of event.args.strategies) {
					if ('shares' in strategy) {
						const detailedData = await calculateStrategyData(
							strategy.strategy,
							BigInt(strategy.shares)
						)

						detailedStrategies.push({
							strategy: strategy.strategy,
							shares: strategy.shares,
							underlyingToken: detailedData.underlyingToken,
							underlyingValue: detailedData.underlyingValue,
							...(withEthValue ? { ethValue: detailedData.ethValue } : {})
						})
					}
				}
				;(event.args as WithdrawalArgs).strategies = detailedStrategies
			} else if (
				['SHARES_INCREASED', 'SHARES_DECREASED', 'DEPOSIT'].includes(event.type) &&
				'strategy' in event.args &&
				event.args.strategy
			) {
				const detailedData = await calculateStrategyData(
					event.args.strategy,
					BigInt(event.args.shares ?? 0)
				)

				underlyingToken = detailedData.underlyingToken
				underlyingValue = detailedData.underlyingValue
				ethValue = detailedData.ethValue
			}

			return {
				...event,
				...(underlyingToken && { underlyingToken }),
				...(underlyingValue !== undefined && { underlyingValue }),
				...(withEthValue && ethValue !== undefined && { ethValue })
			}
		})
	)
}

/**
 * Helper function to calculate underlying token data and ETH values for a strategy.
 *
 * @param strategyAddress
 * @param shares
 * @returns
 */
async function calculateStrategyData(
	strategyAddress: string,
	shares: bigint
): Promise<{ underlyingToken?: string; underlyingValue?: number; ethValue?: number }> {
	let underlyingToken: string | undefined
	let underlyingValue: number | undefined
	let ethValue: number | undefined

	const strategy = await prisma.strategies.findUnique({
		where: { address: strategyAddress.toLowerCase() }
	})

	const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

	if (strategy && strategiesWithSharesUnderlying) {
		underlyingToken = strategy.underlyingToken
		const sharesUnderlying = strategiesWithSharesUnderlying.find(
			(s) => s.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
		)

		if (sharesUnderlying) {
			underlyingValue =
				Number((shares * BigInt(sharesUnderlying.sharesToUnderlying)) / BigInt(1e18)) / 1e18

			if (sharesUnderlying.ethPrice) {
				ethValue = underlyingValue * sharesUnderlying.ethPrice
			}
		}
	}

	return { underlyingToken, underlyingValue, ethValue }
}

/**
 * Helper function to fetch and map event records from the database.
 *
 * @param eventType
 * @param baseFilterQuery
 * @param skip
 * @param take
 * @returns
 */
export async function fetchAndMapEvents(
	eventType: string,
	baseFilterQuery: any,
	skip: number,
	take?: number
): Promise<{ eventRecords: EventRecord[]; eventCount: number }> {
	const modelName = (() => {
		switch (eventType) {
			case 'DEPOSIT':
				return 'eventLogs_Deposit'
			case 'SHARES_INCREASED':
				return 'eventLogs_OperatorSharesIncreased'
			case 'SHARES_DECREASED':
				return 'eventLogs_OperatorSharesDecreased'
			case 'DELEGATION':
				return 'eventLogs_StakerDelegated'
			case 'UNDELEGATION':
				return 'eventLogs_StakerUndelegated'
			case 'WITHDRAWAL_QUEUED':
				return 'eventLogs_WithdrawalQueued'
			case 'WITHDRAWAL_COMPLETED':
				return 'eventLogs_WithdrawalCompleted'
			case 'REWARDS':
				return 'eventLogs_AVSRewardsSubmission'
			default:
				throw new Error(`Unknown event type: ${eventType}`)
		}
	})()

	const model = prisma[modelName] as any

	const eventCount = await model.count({ where: baseFilterQuery })

	const eventRecords = await model.findMany({
		where: baseFilterQuery,
		skip,
		take,
		orderBy: { blockNumber: 'desc' }
	})

	const mappedRecords = eventRecords.map((event) => ({
		type: eventType,
		tx: event.transactionHash,
		blockNumber: event.blockNumber,
		blockTime: event.blockTime,
		args: mapEventArgs(event, eventType)
	}))

	return {
		eventRecords: mappedRecords,
		eventCount
	}
}

/**
 * Helper function to map raw database event data to structured event arguments.
 *
 * @param event
 * @param eventType
 * @returns
 */
function mapEventArgs(event: any, eventType: string): EventArgs {
	switch (eventType) {
		case 'DEPOSIT':
			return {
				staker: event.staker,
				token: event.token,
				strategy: event.strategy,
				shares: event.shares
			}
		case 'WITHDRAWAL_QUEUED':
			return {
				staker: event.staker,
				withdrawalRoot: event.withdrawalRoot,
				delegatedTo: event.delegatedTo,
				withdrawer: event.withdrawer,
				nonce: event.nonce,
				startBlock: event.startBlock,
				strategies: event.strategies?.map((strategy: string, index: number) => ({
					strategy,
					shares: event.shares?.[index]
				}))
			}
		case 'WITHDRAWAL_COMPLETED':
			return { withdrawalRoot: event.withdrawalRoot }
		case 'REWARDS':
			return {
				avs: event.avs,
				submissionNonce: event.submissionNonce,
				rewardsSubmissionHash: event.rewardsSubmissionHash,
				rewardsSubmissionToken: event.rewardsSubmission_token.toLowerCase(),
				rewardsSubmissionAmount: event.rewardsSubmission_amount,
				rewardsSubmissionStartTimeStamp: event.rewardsSubmission_startTimestamp,
				rewardsSubmissionDuration: event.rewardsSubmission_duration,
				strategies: event.strategiesAndMultipliers_strategies.map(
					(strategy: string, index: number) => ({
						strategy: strategy.toLowerCase(),
						multiplier: event.strategiesAndMultipliers_multipliers[index]
					})
				)
			}
		default:
			return {
				operator: event.operator,
				staker: event.staker,
				strategy: event.strategy,
				shares: event.shares
			}
	}
}

/**
 * Utility function to sort events by blockNumber in descending order.
 *
 * @param events - Array of events to sort
 * @returns Sorted array of events
 */
export function sortEvents<T extends { blockNumber: number }>(events: T[]): T[] {
	return events.sort((a, b) => {
		if (b.blockNumber > a.blockNumber) return 1
		if (b.blockNumber < a.blockNumber) return -1
		return 0
	})
}
