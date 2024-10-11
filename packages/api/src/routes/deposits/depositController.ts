import type { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prismaClient } from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { DepositListQuerySchema } from '../../schema/zod/schemas/deposit'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'

/**
 * Route to get a list of all deposits, filtered by stakerAddress, strategyAddress and tokenAddress
 *
 * @param req
 * @param res
 */

export async function getAllDeposits(req: Request, res: Response) {
	// Validate query
	const result = DepositListQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { stakerAddress, tokenAddress, strategyAddress, skip, take } = result.data

	try {
		const filterQuery: Prisma.DepositWhereInput = {}

		if (stakerAddress) {
			filterQuery.stakerAddress = stakerAddress.toLowerCase()
		}

		if (tokenAddress) {
			filterQuery.tokenAddress = tokenAddress.toLowerCase()
		}

		if (strategyAddress) {
			filterQuery.strategyAddress = strategyAddress.toLowerCase()
		}

		const depositCount = await prismaClient.deposit.count({
			where: filterQuery
		})

		const depositRecords = await prismaClient.deposit.findMany({
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
