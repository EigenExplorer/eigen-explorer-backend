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
import { getNetwork } from '../../viem/viemClient'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import { WithCuratedMetadata } from '../../schema/zod/schemas/withCuratedMetadataQuery'

/**
 * Route to get a list of all AVSs
 *
 * @param req
 * @param res
 */
export async function getAllAVS(req: Request, res: Response) {
	// Validate pagination query
	const queryCheck = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(WithCuratedMetadata)
		.safeParse(req.query)

	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { skip, take, withTvl, withCuratedMetadata } = queryCheck.data

		// Fetch count and record
		const avsCount = await prisma.avs.count({ where: getAvsFilterQuery(true) })
		const avsRecords = await prisma.avs.findMany({
			where: getAvsFilterQuery(true),
			skip,
			take,
			include: {
				curatedMetadata: withCuratedMetadata,
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

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
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

				const shares = withOperatorShares(avs.operators).filter(
					(s) =>
						avs.restakeableStrategies.indexOf(
							s.strategyAddress.toLowerCase()
						) !== -1
				)

				return {
					...avs,
					curatedMetadata: withCuratedMetadata
						? avs.curatedMetadata
						: undefined,
					shares,
					totalOperators,
					totalStakers,
					tvl: withTvl
						? sharesToTVL(
								shares,
								strategiesWithSharesUnderlying,
								strategyTokenPrices
						  )
						: undefined,
					operators: undefined,
					metadataUrl: undefined,
					isMetadataSynced: undefined
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
		const avsCount = await prisma.avs.count({ where: getAvsFilterQuery(true) })
		const avsRecords = await prisma.avs.findMany({
			where: getAvsFilterQuery(true),
			skip,
			take
		})

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
	const queryCheck = WithTvlQuerySchema.and(WithCuratedMetadata).safeParse(
		req.query
	)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { withTvl, withCuratedMetadata } = queryCheck.data

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: address.toLowerCase(), ...getAvsFilterQuery() },
			include: {
				curatedMetadata: withCuratedMetadata,
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

		const shares = withOperatorShares(avs.operators).filter(
			(s) =>
				avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !==
				-1
		)

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		res.send({
			...avs,
			curatedMetadata: withCuratedMetadata ? avs.curatedMetadata : undefined,
			shares,
			totalOperators,
			totalStakers,
			tvl: withTvl
				? sharesToTVL(
						shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
				  )
				: undefined,
			operators: undefined,
			metadataUrl: undefined,
			isMetadataSynced: undefined
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
	const queryCheck = PaginationQuerySchema.and(WithTvlQuerySchema).safeParse(
		req.query
	)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { skip, take, withTvl } = queryCheck.data

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: address.toLowerCase(), ...getAvsFilterQuery() },
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

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		const stakers = stakersRecords.map((staker) => {
			const shares = staker.shares.filter(
				(s) => avs.restakeableStrategies.indexOf(s.strategyAddress) !== -1
			)

			return {
				...staker,
				shares,
				tvl: withTvl
					? sharesToTVL(
							shares,
							strategiesWithSharesUnderlying,
							strategyTokenPrices
					  )
					: undefined
			}
		})

		res.send({
			data: stakers,
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
	const queryCheck = PaginationQuerySchema.and(WithTvlQuerySchema).safeParse(
		req.query
	)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { skip, take, withTvl } = queryCheck.data

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: address.toLowerCase(), ...getAvsFilterQuery() },
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

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		const data = operatorsRecords.map((operator) => {
			const avsOperator = avs.operators.find(
				(o) =>
					o.operatorAddress.toLowerCase() === operator.address.toLowerCase()
			)

			const shares = operator.shares.filter(
				(s) => avsOperator?.restakedStrategies.indexOf(s.strategyAddress) !== -1
			)

			return {
				...operator,
				restakedStrategies: avsOperator?.restakedStrategies,
				shares,
				totalStakers: operator.stakers.length,
				tvl: withTvl
					? sharesToTVL(
							shares,
							strategiesWithSharesUnderlying,
							strategyTokenPrices
					  )
					: undefined,
				stakers: undefined,
				metadataUrl: undefined,
				isMetadataSynced: undefined
			}
		})

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
		const shares = avsOperator.operator.shares.filter(
			(s) =>
				avsOperator.restakedStrategies.indexOf(
					s.strategyAddress.toLowerCase()
				) !== -1
		)

		shares.map((s) => {
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

		const updateResult = await prisma.avs.updateMany({
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

// Helper functions
export function getAvsFilterQuery(filterName?: boolean) {
	const queryWithName = filterName
		? {
				OR: [
					{
						metadataName: { not: '' }
					}
				]
		  }
		: {}

	return getNetwork().testnet
		? {
				AND: [
					queryWithName,
					{
						OR: [
							{
								curatedMetadata: {
									isVisible: true
								}
							},
							{
								curatedMetadata: null
							}
						]
					}
				]
		  }
		: {
				AND: [
					queryWithName,
					{
						curatedMetadata: {
							isVisible: true
						}
					}
				]
		  }
}
