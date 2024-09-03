import type { Request, Response } from 'express'
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
import { WithAdditionalDataQuerySchema } from '../../schema/zod/schemas/withAdditionalDataQuery'
import { SortByQuerySchema } from '../../schema/zod/schemas/sortByQuery'
import { ByTextSearchQuerySchema } from '../../schema/zod/schemas/byTextSearchQuery'

/**
 * Function for route /operators
 * Returns a list of all Operators. Optionally perform a text search for a list of matched Operators.
 *
 * @param req
 * @param res
 */
export async function getAllOperators(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(SortByQuerySchema)
		.and(ByTextSearchQuerySchema)
		.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take, byTextSearch } = result.data

	try {
		const { operators, operatorCount } = byTextSearch
			? await doGetOperatorsByTextSearch(byTextSearch.toLowerCase())
			: await doGetAllOperators(result)

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
 * Function for route /operators/:address
 * Returns a single Operator by address
 *
 * @param req
 * @param res
 */
export async function getOperator(req: Request, res: Response) {
	// Validate pagination query
	const result = WithTvlQuerySchema.and(
		WithAdditionalDataQuerySchema
	).safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { withTvl, withAvsData } = result.data

	try {
		const { address } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				avs: {
					select: {
						avsAddress: true,
						isActive: true,
						...(withAvsData
							? {
									avs: {
										select: {
											metadataUrl: true,
											metadataName: true,
											metadataDescription: true,
											metadataDiscord: true,
											metadataLogo: true,
											metadataTelegram: true,
											metadataWebsite: true,
											metadataX: true,
											curatedMetadata: true,
											restakeableStrategies: true,
											totalStakers: true,
											totalOperators: true,
											tvlEth: true,
											createdAtBlock: true,
											updatedAtBlock: true,
											createdAt: true,
											updatedAt: true
										}
									}
							  }
							: {})
					}
				},
				shares: { select: { strategyAddress: true, shares: true } }
			}
		})

		const avsRegistrations = operator.avs.map((registration) => ({
			avsAddress: registration.avsAddress,
			isActive: registration.isActive,
			...(withAvsData && registration.avs ? registration.avs : {})
		}))

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		res.send({
			...operator,
			avsRegistrations,
			totalStakers: operator.totalStakers,
			totalAvs: operator.totalAvs,
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
			avs: undefined,
			tvlEth: undefined,
			sharesHash: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /operators/:address/invalidate-metadata
 * Protected route to invalidate the metadata of a given Operator
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

// --- Processing functions ---

/**
 * Used by getAllOperators()
 * Processes all Operators optionally sorting by tvl, totalStakers and totalAvs
 *
 * @param result
 * @returns
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function doGetAllOperators(result: any) {
	const { skip, take, withTvl, sortByTvl, sortByTotalStakers, sortByTotalAvs } =
		result.data

	// Count records
	const operatorCount = await prisma.operator.count()

	// Setup sort if applicable
	const sortConfig = sortByTotalStakers
		? { field: 'totalStakers', order: sortByTotalStakers }
		: sortByTotalAvs
		  ? { field: 'totalAvs', order: sortByTotalAvs }
		  : sortByTvl
			  ? { field: 'tvlEth', order: sortByTvl }
			  : null

	// Fetch records and apply sort if applicable
	const operatorRecords = await prisma.operator.findMany({
		include: {
			avs: {
				select: { avsAddress: true, isActive: true }
			},
			shares: {
				select: { strategyAddress: true, shares: true }
			}
		},
		skip,
		take,
		...(sortConfig
			? {
					orderBy: {
						[sortConfig.field]: sortConfig.order
					}
			  }
			: {})
	})

	const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
	const strategiesWithSharesUnderlying = withTvl
		? await getStrategiesWithShareUnderlying()
		: []

	const operators = operatorRecords.map((operator) => ({
		...operator,
		avsRegistrations: operator.avs,
		totalStakers: operator.totalStakers,
		totalAvs: operator.totalAvs,
		tvl: withTvl
			? sharesToTVL(
					operator.shares,
					strategiesWithSharesUnderlying,
					strategyTokenPrices
			  )
			: undefined,
		metadataUrl: undefined,
		isMetadataSynced: undefined,
		avs: undefined,
		tvlEth: undefined,
		sharesHash: undefined
	}))

	return { operators, operatorCount }
}

/**
 * Used by getAllOperators()
 * Processes full-text search on name, description and website basis a given query
 *
 * @param searchQuery
 * @returns
 */
async function doGetOperatorsByTextSearch(searchQuery: string) {
	const operators = await prisma.operator.findMany({
		where: {
			OR: [
				{ address: { search: searchQuery } },
				{ metadataName: { search: searchQuery } },
				{ metadataDescription: { search: searchQuery } },
				{ metadataWebsite: { search: searchQuery } }
			]
		},
		select: {
			address: true,
			metadataName: true,
			metadataLogo: true
		},
		orderBy: {
			tvlEth: 'desc'
		},
		take: 10
	})

	return { operators: operators, operatorCount: operators.length }
}
