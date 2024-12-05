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
	fetchDelegationEvents,
	fetchDepositEvents,
	fetchStakerWithdrawalEvents
} from '../../utils/eventUtils'
import {
	StakerDelegationEventQuerySchema,
	DepositEventQuerySchema,
	WithdrawalEventQuerySchema
} from '../../schema/zod/schemas/eventSchemas'

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
 * Fetches and returns a list of delegation-related events for a specific staker
 *
 * @param req
 * @param res
 */
export async function getStakerDelegationEvents(req: Request, res: Response) {
	const result = StakerDelegationEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const {
			type,
			strategyAddress,
			operatorAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data

		const response = await fetchDelegationEvents({
			stakerAddress: address,
			operatorAddress,
			type,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		})

		response.eventRecords.forEach(
			(event) => 'staker' in event.args && (event.args.staker = undefined)
		)

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /stakers/:address/events/deposit
 * Fetches and returns a list of deposit-related events for a specific staker
 *
 * @param req
 * @param res
 */
export async function getStakerDepositEvents(req: Request, res: Response) {
	const result = DepositEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const {
			tokenAddress,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data

		const response = await fetchDepositEvents({
			stakerAddress: address,
			tokenAddress,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		})

		response.eventRecords.forEach((event) => {
			if ('staker' in event.args) {
				event.args.staker = undefined
			}
		})

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
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
	const result = WithdrawalEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

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

		const response = await fetchStakerWithdrawalEvents({
			stakerAddress: address,
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
		})

		response.eventRecords.forEach(
			(event) => 'staker' in event.args && (event.args.staker = undefined)
		)

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
