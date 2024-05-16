import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'

/**
 * Route to get a list of all stakers
 *
 * @param req
 * @param res
 */
export async function getAllStakers(req: Request, res: Response) {
	try {
		// Validate pagination query
		const result = PaginationQuerySchema.safeParse(req.query)
		if (!result.success) {
			return handleAndReturnErrorResponse(req, res, result.error)
		}
		const { skip, take } = result.data

		// Fetch count and record
		const stakersCount = await prisma.staker.count()
		const stakersRecords = await prisma.staker.findMany({
			skip,
			take,
			include: { shares: true }
		})

		const data = await Promise.all(
			stakersRecords.map((staker) => {
				let tvl = 0

				staker.shares.map((ss) => {
					tvl += Number(BigInt(ss.shares)) / 1e18
				})

				return {
					...staker,
					tvl
				}
			})
		)

		res.send({
			data,
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
	try {
		const { address } = req.params

		const staker = await prisma.staker.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: { shares: true }
		})

		let tvl = 0
		const shares = staker.shares

		shares.map((s) => {
			tvl += Number(s.shares) / 1e18
		})

		res.send({
			...staker,
			tvl
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
