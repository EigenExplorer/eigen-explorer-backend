import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { getViemClient } from '../../viem/viemClient'
import { getStrategiesWithShareUnderlying, sharesToTVL } from '../../utils/strategyShares'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { UpdatedSinceQuerySchema } from '../../schema/zod/schemas/updatedSinceQuery'
import {
	DelegationStakerEventQuerySchema,
	DepositStakerEventQuerySchema,
	WithdrawalStakerEventQuerySchema
} from '../../schema/zod/schemas/stakerEvents'

type UnderlyingTokenDetails = {
	underlyingToken?: string
	underlyingValue?: number
	ethValue?: number
}

type StrategyData = {
	strategy: string
	shares: number
} & UnderlyingTokenDetails

type EventRecord = {
	type: string
	tx: string
	blockNumber: number
	blockTime: Date
	args: EventArgs
}

type EventArgs = DelegationArgs | DepositArgs | WithdrawalArgs

type DelegationArgs = {
	operator: string
	strategy?: string
	shares?: number
} & UnderlyingTokenDetails

type DepositArgs = {
	token: string
	strategy: string
	shares: number
} & UnderlyingTokenDetails

type WithdrawalArgs = {
	withdrawalRoot: string
	delegatedTo?: string
	withdrawer?: string
	nonce?: number
	startBlock?: number
	strategies?: StrategyData[]
}

/**
 * Route to get a list of all stakers
 *
 * @param req
 * @param res
 */
export async function getAllStakers(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(UpdatedSinceQuerySchema)
		.safeParse(req.query)

	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take, withTvl, updatedSince } = result.data

	try {
		// Fetch count and record
		const stakersCount = await prisma.staker.count({
			where: updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}
		})

		const stakersRecords = await prisma.staker.findMany({
			skip,
			take,
			where: updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {},
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const stakers = stakersRecords.map((staker) => ({
			...staker,
			tvl: withTvl ? sharesToTVL(staker.shares, strategiesWithSharesUnderlying) : undefined
		}))

		res.send({
			data: stakers,
			meta: {
				total: stakersCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getStaker(req: Request, res: Response) {
	// Validate pagination query
	const result = WithTvlQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { withTvl } = result.data

	try {
		const { address } = req.params

		const staker = await prisma.staker.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		res.send({
			...staker,
			tvl: withTvl ? sharesToTVL(staker.shares, strategiesWithSharesUnderlying) : undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawals(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				isCompleted: !!withdrawal.completedWithdrawal,
				updatedAt: withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				updatedAtBlock: withdrawal.completedWithdrawal?.createdAtBlock || withdrawal.createdAtBlock
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsQueued(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address.toLowerCase(), completedWithdrawal: null }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsWithdrawable(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params

		const viemClient = getViemClient()
		const minDelayBlocks = await prisma.settings.findUnique({
			where: { key: 'withdrawMinDelayBlocks' }
		})
		const minDelayBlock =
			(await viemClient.getBlockNumber()) - BigInt((minDelayBlocks?.value as string) || 0)

		const filterQuery = {
			stakerAddress: address.toLowerCase(),
			completedWithdrawal: null,
			createdAtBlock: { lte: minDelayBlock }
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsCompleted(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = {
			stakerAddress: address.toLowerCase(),
			NOT: {
				completedWithdrawal: null
			}
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				updatedAt: withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				updatedAtBlock: withdrawal.completedWithdrawal?.createdAtBlock || withdrawal.createdAtBlock
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerDeposits(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address.toLowerCase() }

		const depositCount = await prisma.deposit.count({
			where: filterQuery
		})
		const depositRecords = await prisma.deposit.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = depositRecords.map((deposit) => {
			return {
				...deposit
			}
		})

		res.send({
			data,
			meta: {
				total: depositCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /stakers/:address/events/delegation
 * Fetches and returns a list of delegation-related events for a specific staker with optional filters
 *
 * @param req
 * @param res
 */
export async function getStakerDelegationEvents(req: Request, res: Response) {
	const result = DelegationStakerEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const {
			type,
			operator,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			skip,
			take,
			withTokenData,
			withEthValue
		} = result.data
		const { address } = req.params

		const baseFilterQuery = {
			staker: {
				contains: address,
				mode: 'insensitive'
			},
			...(operator && {
				operator: {
					contains: operator,
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

		const eventTypes = type
			? [type]
			: strategyAddress
			? ['SHARES_INCREASED', 'SHARES_DECREASED']
			: ['SHARES_INCREASED', 'SHARES_DECREASED', 'DELEGATION', 'UNDELEGATION']

		const results = await Promise.all(
			eventTypes.map((eventType) =>
				fetchAndMapStakerEvents(
					eventType,
					baseFilterQuery,
					withTokenData,
					withEthValue,
					0,
					undefined
				)
			)
		)

		const allEvents = results.flatMap((result) => result.eventRecords)
		const sortedEvents = allEvents.sort((a, b) => {
			if (b.blockNumber > a.blockNumber) return 1
			if (b.blockNumber < a.blockNumber) return -1
			return 0
		})

		const paginatedEvents = sortedEvents.slice(skip, skip + take)
		const totalEventCount = allEvents.length

		res.send({
			data: paginatedEvents,
			meta: { total: totalEventCount, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /stakers/:address/events/deposit
 * Fetches and returns a list of deposit events for a specific staker with optional filters
 *
 * @param req
 * @param res
 */
export async function getStakerDepositEvents(req: Request, res: Response) {
	const result = DepositStakerEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { txHash, startAt, endAt, token, strategy, skip, take, withTokenData, withEthValue } =
			result.data
		const { address } = req.params

		const baseFilterQuery = {
			staker: {
				contains: address,
				mode: 'insensitive'
			},
			...(token && {
				token: {
					contains: token,
					mode: 'insensitive'
				}
			}),
			...(strategy && {
				strategy: {
					contains: strategy,
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

		const results = await fetchAndMapStakerEvents(
			'DEPOSIT',
			baseFilterQuery,
			withTokenData,
			withEthValue,
			skip,
			take
		)

		res.send({
			data: results.eventRecords,
			meta: { total: results.eventCount, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /stakers/:address/events/withdrawal
 * Fetches and returns a list of withdrawal-related events for a specific staker with optional filters
 *
 * @param req
 * @param res
 */
export async function getStakerWithdrawalEvents(req: Request, res: Response) {
	const result = WithdrawalStakerEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const {
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
		} = result.data
		const { address } = req.params

		let queuedEvents: EventRecord[] = []
		let completedEvents: EventRecord[] = []

		const queuedFilterQuery = {
			staker: {
				contains: address,
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
			}),
			blockTime: {
				gte: new Date(startAt as string),
				...(endAt ? { lte: new Date(endAt as string) } : {})
			}
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
			})
		}

		if (txHash || (type === 'WITHDRAWAL_COMPLETED' && withdrawalRoot)) {
			const completedResult = await fetchAndMapStakerEvents(
				'WITHDRAWAL_COMPLETED',
				completedFilterQuery,
				withTokenData,
				withEthValue,
				skip,
				take
			)

			if (completedResult.eventRecords.length > 0 && type != 'WITHDRAWAL_QUEUED') {
				return res.send({
					data: completedResult.eventRecords,
					meta: { total: completedResult.eventCount, skip, take }
				})
			}
		}

		const queuedResult = await fetchAndMapStakerEvents(
			'WITHDRAWAL_QUEUED',
			queuedFilterQuery,
			withTokenData,
			withEthValue,
			0,
			undefined
		)

		if (txHash) {
			if (queuedResult.eventRecords.length > 0 && type !== 'WITHDRAWAL_COMPLETED') {
				return res.send({
					data: queuedResult.eventRecords,
					meta: { total: queuedResult.eventCount, skip, take }
				})
			}

			return res.send({
				data: [],
				meta: { total: 0, skip, take }
			})
		}

		if (type === 'WITHDRAWAL_QUEUED') {
			const paginatedEvents = queuedResult.eventRecords.slice(skip, skip + take)

			return res.send({
				data: paginatedEvents,
				meta: { total: queuedResult.eventCount, skip, take }
			})
		}

		// Default case: Fetch queued events, then use withdrawalRoots for completed events
		queuedEvents = queuedResult.eventRecords

		const withdrawalRoots = queuedEvents
			.map((event) => (event.args as WithdrawalArgs).withdrawalRoot)
			.filter((root): root is string => root !== undefined)

		let completedEventCount = 0
		if (withdrawalRoots != null && withdrawalRoots.length) {
			const completedResult = await fetchAndMapStakerEvents(
				'WITHDRAWAL_COMPLETED',
				{ withdrawalRoot: { in: withdrawalRoots } },
				withTokenData,
				withEthValue,
				0,
				undefined
			)
			completedEvents = completedResult.eventRecords
			completedEventCount = completedResult.eventCount
		}

		const eventRecords =
			type === 'WITHDRAWAL_COMPLETED' ? completedEvents : [...queuedEvents, ...completedEvents]

		const sortedEvents = eventRecords.sort((a, b) => {
			if (b.blockNumber > a.blockNumber) return 1
			if (b.blockNumber < a.blockNumber) return -1
			return 0
		})

		const paginatedEvents = sortedEvents.slice(skip, skip + take)
		const eventCount =
			type === 'WITHDRAWAL_COMPLETED'
				? completedEventCount
				: queuedResult.eventCount + completedEventCount
		res.send({
			data: paginatedEvents,
			meta: { total: eventCount, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Helper functions ---

/**
 * Utility function to calculate underlying token data and ETH values for a strategy.
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
 * Utility function to fetch and map event records from the database.
 *
 * @param eventType
 * @param baseFilterQuery
 * @param withTokenData
 * @param withEthValue
 * @param skip
 * @param take
 * @returns
 */
async function fetchAndMapStakerEvents(
	eventType: string,
	baseFilterQuery: any,
	withTokenData: boolean,
	withEthValue: boolean,
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

	const detailedEventRecords = await Promise.all(
		eventRecords.map(async (event) => {
			const detailedStrategies: StrategyData[] = []
			let underlyingToken: string | undefined
			let underlyingValue: number | undefined
			let ethValue: number | undefined

			if (withTokenData && eventType === 'WITHDRAWAL_QUEUED' && event.strategies) {
				for (const [index, strategyAddress] of event.strategies.entries()) {
					const detailedData = await calculateStrategyData(
						strategyAddress,
						BigInt(event.shares[index])
					)

					const strategyData = {
						strategy: strategyAddress,
						shares: event.shares[index],
						underlyingToken: detailedData.underlyingToken,
						underlyingValue: detailedData.underlyingValue,
						...(withEthValue ? { ethValue: detailedData.ethValue } : {})
					}
					detailedStrategies.push(strategyData)
				}
			} else if (
				withTokenData &&
				(eventType === 'SHARES_INCREASED' ||
					eventType === 'SHARES_DECREASED' ||
					eventType === 'DEPOSIT') &&
				event.strategy
			) {
				const detailedData = await calculateStrategyData(event.strategy, BigInt(event.shares))
				underlyingToken = detailedData.underlyingToken
				underlyingValue = detailedData.underlyingValue
				ethValue = detailedData.ethValue
			}

			return {
				type: eventType,
				tx: event.transactionHash,
				blockNumber: event.blockNumber,
				blockTime: event.blockTime,
				args: {
					...mapEventArgs(event, eventType),
					...(detailedStrategies.length > 0 && { strategies: detailedStrategies })
				},
				...(underlyingToken && { underlyingToken }),
				...(underlyingValue !== undefined && { underlyingValue }),
				...(withEthValue && ethValue !== undefined && { ethValue })
			}
		})
	)

	return {
		eventRecords: detailedEventRecords,
		eventCount
	}
}

/**
 * Utility function to map raw database event data to structured event arguments.
 *
 * @param event
 * @param eventType
 * @returns
 */
function mapEventArgs(event: any, eventType: string): EventArgs {
	switch (eventType) {
		case 'DEPOSIT':
			return {
				token: event.token,
				strategy: event.strategy,
				shares: event.shares
			}
		case 'WITHDRAWAL_QUEUED':
			return {
				withdrawalRoot: event.withdrawalRoot,
				delegatedTo: event.delegatedTo,
				withdrawer: event.withdrawer,
				nonce: event.nonce,
				startBlock: event.startBlock,
				strategies: event.strategies.map((strategyAddress: string, index: number) => ({
					strategy: strategyAddress,
					shares: event.shares[index]
				}))
			}
		case 'WITHDRAWAL_COMPLETED':
			return {
				withdrawalRoot: event.withdrawalRoot
			}
		default:
			return {
				operator: event.operator,
				strategy: event.strategy,
				shares: event.shares
			}
	}
}
