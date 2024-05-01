import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { OperatorStrategyShares } from '@prisma/client'
import { IMap } from '../../schema/generic'
import { getViemClient } from '../../viem/viemClient'
import { getEigenContracts } from '../../data/address'
import { strategyAbi } from '../../data/abi/strategy'
import { erc20Abi } from 'viem'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL
} from '../strategies/strategiesController'

/**
 * Route to get a list of all operators
 *
 * @param req
 * @param res
 */
export async function getAllOperators(req: Request, res: Response) {
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
		const operatorCount = await prisma.operator.count()
		const operatorRecords = await prisma.operator.findMany({
			skip,
			take,
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				stakers: true
			}
		})

		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		const operators = operatorRecords.map((operator) => ({
			...operator,
			totalStakers: operator.stakers.length,
			tvl: withTvl
				? sharesToTVL(operator.shares, strategiesWithSharesUnderlying)
				: undefined,
			stakers: undefined
		}))

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
	// Validate pagination query
	const result = WithTvlQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { withTvl } = result.data

	try {
		const { id } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: id },
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				stakers: true
			}
		})

		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		res.send({
			...operator,
			totalStakers: operator.stakers.length,
			tvl: withTvl
				? sharesToTVL(operator.shares, strategiesWithSharesUnderlying)
				: undefined,
			stakers: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// Helper methods
function withOperatorTvl(operator: {
	shares: { shares: string; strategyAddress: string }[]
}) {
	let tvl = 0

	operator.shares.map((s) => {
		tvl += Number(s.shares) / 1e18
	})

	return {
		...operator,
		tvl
	}
}

export async function withOperatorTvlAndShares(operator: {
	shares: { shares: string; strategyAddress: string }[]
}) {
	let tvl = 0
	const sharesMap: IMap<string, string> = new Map()

	// console.time('lol')
	// const viemClient = getViemClient()

	// const strategies = await Promise.all(
	// 	Object.values(getEigenContracts().Strategies).map(async (s) => {
	// 		try {
	// 			return {
	// 				strategyContract: s.strategyContract,
	// 				tokenContract: s.tokenContract,
	// 				totalShares: await viemClient.readContract({
	// 					abi: strategyAbi,
	// 					address: s.strategyContract,
	// 					functionName: 'totalShares'
	// 				}),
	// 				totalSupply: await viemClient.readContract({
	// 					abi: erc20Abi,
	// 					address: s.tokenContract,
	// 					functionName: 'totalSupply'
	// 				})
	// 			}
	// 		} catch (error) {
	// 			console.log('err strategy', s.strategyContract, s.tokenContract)
	// 		}
	// 	})
	// )

	// console.log('strategies', strategies)

	// console.timeEnd('lol')

	operator.shares.map((s) => {
		if (!sharesMap.has(s.strategyAddress)) {
			sharesMap.set(s.strategyAddress, '0')
		}

		sharesMap.set(
			s.strategyAddress,
			(BigInt(sharesMap.get(s.strategyAddress)) + BigInt(s.shares)).toString()
		)

		tvl += Number(s.shares) / 1e18
	})

	return {
		...operator,
		stakers: undefined,
		shares: Array.from(sharesMap, ([strategyAddress, shares]) => ({
			strategyAddress,
			shares
		})),
		tvl
	}
}
