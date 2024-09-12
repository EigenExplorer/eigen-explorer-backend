import type Prisma from '@prisma/client'
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
import { SearchByTextQuerySchema } from '../../schema/zod/schemas/searchByTextQuery'

/**
 * Function for route /operators
 * Returns a list of all Operators with optional sorts & text search
 *
 * @param req
 * @param res
 */
export async function getAllOperators(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(SortByQuerySchema)
		.and(SearchByTextQuerySchema)
		.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const {
		skip,
		take,
		withTvl,
		sortByTvl,
		sortByTotalStakers,
		sortByTotalAvs,
		searchByText
	} = result.data

	const searchConfig = { contains: searchByText, mode: 'insensitive' }

	try {
		// Setup sort if applicable
		const sortConfig = sortByTotalStakers
			? { field: 'totalStakers', order: sortByTotalStakers }
			: sortByTotalAvs
			  ? { field: 'totalAvs', order: sortByTotalAvs }
			  : sortByTvl
				  ? { field: 'tvlEth', order: sortByTvl }
				  : null

		// Fetch records and apply search/sort
		const operatorRecords = await prisma.operator.findMany({
			include: {
				avs: {
					select: { avsAddress: true, isActive: true }
				},
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			},
			...(searchByText && {
				where: {
					OR: [
						{ address: searchConfig },
						{ metadataName: searchConfig }
					] as Prisma.Prisma.OperatorWhereInput[]
				}
			}),
			orderBy: sortConfig
				? { [sortConfig.field]: sortConfig.order }
				: searchByText
				  ? { tvlEth: 'desc' }
				  : undefined,
			skip,
			take
		})

		// Count records
		const operatorCount = searchByText
			? await prisma.operator.count({
					where: {
						OR: [
							{ address: searchConfig },
							{ metadataName: searchConfig }
						] as Prisma.Prisma.OperatorWhereInput[]
					}
			  })
			: await prisma.operator.count()

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
 * Function for route /operator/addresses
 * Returns a list of all Operators, addresses & logos. Optionally perform a text search for a list of matched Operators.
 *
 * @param req
 * @param res
 */
export async function getAllOperatorAddresses(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(SearchByTextQuerySchema).safeParse(
		req.query
	)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	try {
		const { skip, take, searchByText } = result.data
		const searchConfig = { contains: searchByText, mode: 'insensitive' }

		// Fetch records
		const operatorRecords = await prisma.operator.findMany({
			select: {
				address: true,
				metadataName: true,
				metadataLogo: true
			},
			where: {
				...(searchByText && {
					OR: [
						{ address: searchConfig },
						{ metadataName: searchConfig },
						{ metadataDescription: searchConfig },
						{ metadataWebsite: searchConfig }
					] as Prisma.Prisma.OperatorWhereInput[]
				})
			},
			...(searchByText && {
				orderBy: {
					tvlEth: 'desc'
				}
			}),
			skip,
			take
		})

		// Determine count
		const operatorCount = searchByText
			? await prisma.operator.count({
					where: {
						OR: [
							{ address: searchConfig },
							{ metadataName: searchConfig },
							{ metadataDescription: searchConfig },
							{ metadataWebsite: searchConfig }
						] as Prisma.Prisma.OperatorWhereInput[]
					}
			  })
			: await prisma.operator.count()

		const data = operatorRecords.map((operator) => ({
			address: operator.address,
			name: operator.metadataName,
			logo: operator.metadataLogo
		}))

		// Send response with data and metadata
		res.send({
			data,
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
