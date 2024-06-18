import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { getViemClient } from '../../viem/viemClient'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL
} from '../strategies/strategiesController'

/**
 * Route to get a list of all stakers
 *
 * @param req
 * @param res
 */
export async function getAllStakers(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(WithTvlQuerySchema).safeParse(
		req.query
	)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take, withTvl } = result.data

	try {
		// Fetch count and record
		const stakersCount = await prisma.staker.count()
		const stakersRecords = await prisma.staker.findMany({
			skip,
			take,
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			}
		})

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		const stakers = stakersRecords.map((staker) => ({
			...staker,
			createdAtBlock: Number(staker.createdAtBlock),
			updatedAtBlock: Number(staker.updatedAtBlock),
			tvl: withTvl
				? sharesToTVL(
						staker.shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
				  )
				: undefined
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

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		res.send({
			...staker,
			createdAtBlock: Number(staker.createdAtBlock),
			updatedAtBlock: Number(staker.updatedAtBlock),
			tvl: withTvl
				? sharesToTVL(
						staker.shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
				  )
				: undefined
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

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address }

		const withdrawalCount = await prisma.withdrawal.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawal.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { startBlock: 'desc' }
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
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock),
				updatedAtBlock: Number(withdrawal.updatedAtBlock)
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

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address, isCompleted: false }

		const withdrawalCount = await prisma.withdrawal.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawal.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { startBlock: 'desc' }
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
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock),
				updatedAtBlock: Number(withdrawal.updatedAtBlock)
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

export async function getStakerWithdrawalsWithdrawable(
	req: Request,
	res: Response
) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params

		const viemClient = getViemClient()
		const minDelayBlocks = await prisma.settings.findUnique({
			where: { key: 'withdrawMinDelayBlocks' }
		})
		const minDelayBlock =
			(await viemClient.getBlockNumber()) -
			BigInt((minDelayBlocks?.value as string) || 0)

		const filterQuery = {
			stakerAddress: address,
			isCompleted: false,
			startBlock: { lte: minDelayBlock }
		}

		const withdrawalCount = await prisma.withdrawal.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawal.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { startBlock: 'desc' }
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
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock),
				updatedAtBlock: Number(withdrawal.updatedAtBlock)
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

export async function getStakerWithdrawalsCompleted(
	req: Request,
	res: Response
) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address, isCompleted: true }

		const withdrawalCount = await prisma.withdrawal.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawal.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { startBlock: 'desc' }
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
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock),
				updatedAtBlock: Number(withdrawal.updatedAtBlock)
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

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address }

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
				...deposit,
				createdAtBlock: Number(deposit.createdAtBlock)
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
