import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { WithdrawalListQuerySchema } from '../../schema/zod/schemas/withdrawal'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { getViemClient } from '../../viem/viemClient'

/**
 * Route to get a list of all withdrawals
 *
 * @param req
 * @param res
 */
export async function getAllWithdrawals(req: Request, res: Response) {
	// Validate query
	const result = WithdrawalListQuerySchema.and(PaginationQuerySchema).safeParse(
		req.query
	)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { stakerAddress, delegatedTo, strategyAddress, status, skip, take } =
		result.data

	try {
		const filterQuery: Prisma.WithdrawalQueuedWhereInput = {}

		if (stakerAddress) {
			filterQuery.stakerAddress = stakerAddress.toLowerCase()
		}

		if (delegatedTo) {
			filterQuery.delegatedTo = delegatedTo.toLowerCase()
		}

		if (strategyAddress) {
			filterQuery.strategies = { has: strategyAddress.toLowerCase() }
		}

		if (status) {
			switch (status) {
				case 'queued':
					filterQuery.completedWithdrawal = null
					break
				case 'queued_withdrawable': {
					const viemClient = getViemClient()
					const minDelayBlocks = await prisma.settings.findUnique({
						where: { key: 'withdrawMinDelayBlocks' }
					})
					const minDelayBlock =
						(await viemClient.getBlockNumber()) -
						BigInt((minDelayBlocks?.value as string) || 0)

					filterQuery.completedWithdrawal = null
					filterQuery.createdAtBlock = { lte: minDelayBlock }
					break
				}
				case 'completed':
					filterQuery.NOT = { completedWithdrawal: null }
					break
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
				isCompleted: !!withdrawal.completedWithdrawal,
				updatedAt:
					withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				updatedAtBlock:
					withdrawal.completedWithdrawal?.createdAtBlock ||
					withdrawal.createdAtBlock
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

/**
 * Route to get a single withdrawal
 *
 * @param req
 * @param res
 */
export async function getWithdrawal(req: Request, res: Response) {
	try {
		const { withdrawalRoot } = req.params

		const withdrawal = await prisma.withdrawalQueued.findUniqueOrThrow({
			where: { withdrawalRoot },
			include: {
				completedWithdrawal: true
			}
		})

		const shares = withdrawal.shares.map((s, i) => ({
			strategyAddress: withdrawal.strategies[i],
			shares: s
		}))

		res.send({
			...withdrawal,
			shares,
			strategies: undefined,
			completedWithdrawal: undefined,
			isCompleted: !!withdrawal.completedWithdrawal,
			updatedAt:
				withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
			updatedAtBlock:
				withdrawal.completedWithdrawal?.createdAtBlock ||
				withdrawal.createdAtBlock
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
