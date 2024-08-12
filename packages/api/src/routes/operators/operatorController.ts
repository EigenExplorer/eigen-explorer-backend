import type { Request, Response } from 'express'
import type Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
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
	const { skip, take, withTvl, sortByTvl, sortByTotalStakers, sortByTotalAvs } =
		result.data

	try {
		// Count records
		const operatorCount = await prisma.operator.count()

		// Setup sort if applicable
		const sortConfig = sortByTvl
			? { field: 'tvlEth', order: sortByTvl }
			: sortByTotalStakers
			  ? { field: 'totalStakers', order: sortByTotalStakers }
			  : sortByTotalAvs
				  ? { field: 'totalAvs', order: sortByTotalAvs }
				  : null

		// If sorting, apply skip/take and fetch relevant addresses
		const latestTimestamps = sortConfig
			? await prisma.metricOperatorHourly.groupBy({
					by: ['operatorAddress'],
					_max: {
						timestamp: true
					}
			  })
			: null

		const operatorAddresses = sortConfig
			? (
					await prisma.metricOperatorHourly.findMany({
						where: {
							OR: latestTimestamps?.map((lt) => ({
								operatorAddress: lt.operatorAddress,
								timestamp: lt._max.timestamp
							})) as Prisma.Prisma.MetricOperatorHourlyWhereInput[]
						},
						orderBy: {
							[sortConfig.field]: sortConfig.order
						},
						skip,
						take
					})
			  )?.map((op) => op.operatorAddress)
			: null

		// If sorting, fetch records from relevant addresses, else apply skip/take
		const operatorRecords = await prisma.operator.findMany({
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				_count: {
					select: {
						avs: true,
						stakers: true
					}
				}
			},
			where: operatorAddresses
				? {
						address: {
							in: operatorAddresses
						}
				  }
				: {},
			...(operatorAddresses ? {} : { skip, take })
		})

		// If sorting, re-order the records
		if (operatorAddresses) {
			operatorRecords.sort(
				(a, b) =>
					operatorAddresses.indexOf(a.address) -
					operatorAddresses.indexOf(b.address)
			)
		}

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		const operators = operatorRecords.map((operator) => ({
			...operator,
			totalStakers: operator._count.stakers,
			totalAvs: operator._count.avs,
			tvl: withTvl
				? sharesToTVL(
						operator.shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
				  )
				: undefined,
			stakers: undefined,
			metadataUrl: undefined,
			isMetadataSynced: undefined,
			_count: undefined
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

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}
	
	const { withTvl } = result.data

	try {
		const { address } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				_count: {
					select: {
						stakers: true,
						avs: true
					}
				}
			}
		})

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		res.send({
			...operator,
			totalStakers: operator._count.stakers,
			totalAvs: operator._count.avs,
			tvl: withTvl
				? sharesToTVL(
						operator.shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
				  )
				: undefined,
			stakers: undefined,
			metadataUrl: undefined,
			isMetadataSynced: undefined,
			_count: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Protected route to invalidate the metadata of a given address
 *
 * @param req
 * @param res
 */
export async function invalidateMetadata(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params

		const updateResult = await prisma.operator.updateMany({
			where: { address: address.toLowerCase() },
			data: { isMetadataSynced: false }
		})

		if (updateResult.count === 0) {
			throw new Error('Address not found.')
		}

		res.send({ message: 'Metadata invalidated successfully.' })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
