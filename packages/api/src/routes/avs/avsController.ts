import prisma from '../../utils/prismaClient'
import type { Request, Response } from 'express'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { EthereumAddressSchema } from '../../schema/zod/schemas/avs'
import {
	withOperatorTvl,
	withOperatorTvlAndShares
} from '../operators/operatorController'
import { IMap } from '../../schema/generic'

/**
 * Route to get a list of all AVSs
 *
 * @param req
 * @param res
 */
export async function getAllAVS(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take } = result.data

	try {
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
								stakers: {
									include: {
										shares: true
									}
								}
							}
						}
					}
				}
			}
		})

		const data = avsRecords.map((avs) => {
			let tvl = 0
			let totalStakers = 0
			const totalOperators = avs.operators.length

			avs.operators.map((avsOperator) => {
				const operator = withOperatorTvl(avsOperator.operator)

				tvl += operator.tvl
				totalStakers += operator.totalStakers
			})

			return {
				...avs,
				operators: undefined,
				tvl,
				totalOperators,
				totalStakers
			}
		})

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
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take } = result.data

	try {
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
 * Route to get a single AVS
 *
 * @param req
 * @param res
 */
export async function getAVS(req: Request, res: Response) {
	const { id } = req.params

	const result = EthereumAddressSchema.safeParse(id)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	try {
		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: id },
			include: {
				operators: {
					where: { isActive: true },
					include: {
						operator: {
							include: {
								stakers: {
									include: {
										shares: true
									}
								}
							}
						}
					}
				}
			}
		})

		let tvl = 0
		let totalStakers = 0
		const totalOperators = avs.operators.length
		const sharesMap: IMap<string, string> = new Map()

		avs.operators
			.map((avsOperator) => avsOperator.operator)
			.map((operator) => withOperatorTvlAndShares(operator))
			.map((operator) => {
				operator.shares.map((s) => {
					if (!sharesMap.has(s.strategyAddress)) {
						sharesMap.set(s.strategyAddress, '0')
					}

					sharesMap.set(
						s.strategyAddress,
						(
							BigInt(sharesMap.get(s.strategyAddress)) + BigInt(s.shares)
						).toString()
					)
				})

				tvl += operator.tvl
				totalStakers += operator.totalStakers
			})

		res.send({
			...avs,
			shares: Array.from(sharesMap, ([strategyAddress, shares]) => ({
				strategyAddress,
				shares
			})),
			tvl,
			totalOperators,
			totalStakers,
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
	// Validate pagination query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take } = result.data

	try {
		const { id } = req.params
		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: id },
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
	try {
		// Validate pagination query
		const result = PaginationQuerySchema.safeParse(req.query)
		if (!result.success) {
			return handleAndReturnErrorResponse(req, res, result.error)
		}
		const { skip, take } = result.data

		const { id } = req.params
		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: id },
			include: { operators: true }
		})

		const operatorAddresses = avs.operators
			.filter((o) => o.isActive)
			.map((o) => o.operatorAddress)

		const operatorsCount = await prisma.operator.count({
			where: { address: { in: operatorAddresses } }
		})

		const operatorsRecords = await prisma.operator.findMany({
			where: { address: { in: operatorAddresses } },
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

		const data = operatorsRecords.map((operator) => withOperatorTvl(operator))

		res.send({
			data,
			meta: {
				total: operatorsCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
