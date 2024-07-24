import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL
} from '../strategies/strategiesController'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'

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
	const { skip, take, withTvl, sortByTvl } = result.data

	try {
<<<<<<< HEAD
		// Fetch count
=======
		// Fetch count and records
>>>>>>> dev
		const operatorCount = await prisma.operator.count()

		// Fetch all records if sorting by TVL, otherwise use pagination
		const operatorRecords = await prisma.operator.findMany({
			...(sortByTvl ? {} : { skip, take }),
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
			}
		})

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		let operators = operatorRecords.map((operator) => ({
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

		// Sort by tvl & apply skip/take if sortByTvl is provided
		if (sortByTvl) {
			operators.sort((a, b) => {
				if (a.tvl === undefined || b.tvl === undefined) return 0
				return sortByTvl === 'desc'
					? b.tvl.tvl - a.tvl.tvl
					: a.tvl.tvl - b.tvl.tvl
			})

			operators = operators.slice(skip, skip + take)
		}

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
