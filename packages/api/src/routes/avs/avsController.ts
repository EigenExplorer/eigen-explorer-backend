import prisma from '../../utils/prismaClient'
import type { Request, Response } from 'express'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { IMap } from '../../schema/generic'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL
} from '../strategies/strategiesController'

/**
 * Route to get a list of all AVSs
 *
 * @param req
 * @param res
 */
export async function getAllAVS(req: Request, res: Response) {
	// Validate pagination query
	const queryCheck = PaginationQuerySchema.and(WithTvlQuerySchema).safeParse(
		req.query
	)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { skip, take, withTvl } = queryCheck.data

		// Fetch count and record
		const avsCount = await prisma.avs.count()
		const avsRecords = await prisma.avs.findMany({
			skip,
			take,
			include: {
				operators: {
					where: { isActive: true },
					include: {
						operator: {
							include: {
								shares: true
							}
						}
					}
				}
			}
		})

		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		const data = await Promise.all(
			avsRecords.map(async (avs) => {
				const totalOperators = avs.operators.length
				const totalStakers = await prisma.staker.count({
					where: {
						operatorAddress: {
							in: avs.operators.map((o) => o.operatorAddress)
						}
					}
				})

				const shares = withOperatorShares(avs.operators)

				return {
					...avs,
					shares,
					totalOperators,
					totalStakers,
					tvl: withTvl
						? sharesToTVL(shares, strategiesWithSharesUnderlying)
						: undefined,
					operators: undefined
				}
			})
		)

		res.send({
			data,
			meta: {
				total: avsCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to get a list of all AVS and their addresses
 *
 * @param req
 * @param res
 */
export async function getAllAVSAddresses(req: Request, res: Response) {
	// Validate pagination query
	const queryCheck = PaginationQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { skip, take } = queryCheck.data

		// Fetch count and records
		const avsCount = await prisma.avs.count()
		const avsRecords = await prisma.avs.findMany({ skip, take })

		// Simplified map (assuming avs.address is not asynchronous)
		const data = avsRecords.map((avs) => ({
			name: avs.metadataName,
			address: avs.address
		}))

		// Send response with data and metadata
		res.send({
			data,
			meta: {
				total: avsCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to get a single AVS by address
 *
 * @param req
 * @param res
 */
export async function getAVS(req: Request, res: Response) {
	// Validate query and params
	const queryCheck = WithTvlQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { withTvl } = req.query

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address },
			include: {
				operators: {
					where: { isActive: true },
					include: {
						operator: {
							include: {
								shares: true
							}
						}
					}
				}
			}
		})

		const totalOperators = avs.operators.length
		const totalStakers = await prisma.staker.count({
			where: {
				operatorAddress: {
					in: avs.operators.map((o) => o.operatorAddress)
				}
			}
		})

		const shares = withOperatorShares(avs.operators)
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		res.send({
			...avs,
			shares,
			totalOperators,
			totalStakers,
			tvl: withTvl
				? sharesToTVL(shares, strategiesWithSharesUnderlying)
				: undefined,
			operators: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to get all AVS stakers
 *
 * @param req
 * @param res
 * @returns
 */
export async function getAVSStakers(req: Request, res: Response) {
	// Validate query and params
	const queryCheck = PaginationQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { skip, take } = queryCheck.data

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address },
			include: { operators: true }
		})

		const operatorAddresses = avs.operators
			.filter((o) => o.isActive)
			.map((o) => o.operatorAddress)

		const stakersCount = await prisma.staker.count({
			where: { operatorAddress: { in: operatorAddresses } }
		})

		const stakersRecords = await prisma.staker.findMany({
			where: { operatorAddress: { in: operatorAddresses } },
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
 * Route to get all AVS operators
 *
 * @param req
 * @param res
 * @returns
 */
export async function getAVSOperators(req: Request, res: Response) {
	// Validate query and params
	const queryCheck = PaginationQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { skip, take } = queryCheck.data

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address },
			include: {
				operators: {
					where: { isActive: true }
				}
			}
		})

		const operatorsRecords = await prisma.operator.findMany({
			where: {
				address: { in: avs.operators.map((o) => o.operatorAddress) }
			},
			skip,
			take,
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				stakers: true
			}
		})

		const data = operatorsRecords.map((operator) => ({
			...operator,
			stakers: undefined,
			totalStakers: operator.stakers.length
		}))

		res.send({
			data,
			meta: {
				total: avs.operators.length,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// Helper methods
function withOperatorShares(avsOperators) {
	const sharesMap: IMap<string, string> = new Map()

	avsOperators.map((avsOperator) => {
		avsOperator.operator.shares.map((s) => {
			if (!sharesMap.has(s.strategyAddress)) {
				sharesMap.set(s.strategyAddress, '0')
			}

			sharesMap.set(
				s.strategyAddress,
				(BigInt(sharesMap.get(s.strategyAddress)) + BigInt(s.shares)).toString()
			)
		})
	})

	return Array.from(sharesMap, ([strategyAddress, shares]) => ({
		strategyAddress,
		shares
	}))
}
