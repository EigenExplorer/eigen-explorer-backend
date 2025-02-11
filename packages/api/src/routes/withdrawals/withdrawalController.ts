import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { WithdrawalListQuerySchema } from '../../schema/zod/schemas/withdrawal'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { getViemClient } from '../../viem/viemClient'
import { processWithdrawals } from '../../utils/strategyShares'

/**
 * Route to get a list of all withdrawals
 *
 * @param req
 * @param res
 */
export async function getAllWithdrawals(req: Request, res: Response) {
	// Validate query
	const result = WithdrawalListQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { stakerAddress, delegatedTo, strategyAddress, status, skip, take } = result.data

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
						(await viemClient.getBlockNumber()) - BigInt((minDelayBlocks?.value as string) || 0)

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

		const data = await processWithdrawals(withdrawalRecords)

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

		// Process single withdrawal using helper function
		const [processedWithdrawal] = await processWithdrawals([withdrawal])
		res.send(processedWithdrawal)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
