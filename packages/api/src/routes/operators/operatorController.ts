import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { StakerStrategyShares } from '@prisma/client'
import { IMap } from '../../schema/generic'

/**
 * Route to get a list of all operators
 *
 * @param req
 * @param res
 */
export async function getAllOperators(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take } = result.data

	try {
		// Fetch count and record
		const operatorCount = await prisma.operator.count()
		const operatorRecords = await prisma.operator.findMany({
			skip,
			take,
			include: {
				stakers: {
					include: {
						shares: true
					}
				}
			}
		})

		const operators = operatorRecords.map((operator) =>
			withOperatorTvl(operator)
		)

		res.send({
			data: operators,
			meta: {
				total: operatorCount,
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
export async function getOperator(req: Request, res: Response) {
	try {
		const { id } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: id },
			include: {
				stakers: {
					include: {
						shares: true
					}
				}
			}
		})

		let tvl = 0

		operator.stakers.map((staker) => {
			staker.shares.map((s) => {
				tvl += Number(s.shares) / 1e18
			})
		})

		res.send(withOperatorTvlAndShares(operator))
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// Helper methods
export function withOperatorTvl(operator: {
	stakers: { shares: StakerStrategyShares[] }[]
}) {
	let tvl = 0

	operator.stakers.map((staker) => {
		staker.shares.map((s) => {
			tvl += Number(s.shares) / 1e18
		})
	})

	return {
		...operator,
		tvl,
		totalStakers: operator.stakers.length,
		stakers: undefined
	}
}

export function withOperatorTvlAndShares(operator: {
	stakers: { shares: StakerStrategyShares[] }[]
}) {
	let tvl = 0
	const sharesMap: IMap<string, string> = new Map()

	operator.stakers.map((staker) => {
		staker.shares.map((s) => {
			if (!sharesMap.has(s.strategyAddress)) {
				sharesMap.set(s.strategyAddress, '0')
			}

			sharesMap.set(
				s.strategyAddress,
				(BigInt(sharesMap.get(s.strategyAddress)) + BigInt(s.shares)).toString()
			)

			tvl += Number(s.shares) / 1e18
		})
	})

	return {
		...operator,
		stakers: undefined,
		shares: Array.from(sharesMap, ([strategyAddress, shares]) => ({
			strategyAddress,
			shares
		})),
		tvl,
		totalStakers: operator.stakers.length
	}
}
