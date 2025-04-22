import type { Request, Response } from 'express'
import type { Submission } from '../rewards/rewardController'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { WithCuratedMetadata } from '../../schema/zod/schemas/withCuratedMetadataQuery'
import { UpdatedSinceQuerySchema } from '../../schema/zod/schemas/updatedSinceQuery'
import { SortByQuerySchema } from '../../schema/zod/schemas/sortByQuery'
import { SearchByTextQuerySchema } from '../../schema/zod/schemas/searchByTextQuery'
import { WithRewardsQuerySchema } from '../../schema/zod/schemas/withRewardsQuery'
import { getOperatorSearchQuery } from '../operators/operatorController'
import { EigenExplorerApiError, handleAndReturnErrorResponse } from '../../schema/errors'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL,
	sharesToTVLStrategies
} from '../../utils/strategyShares'
import Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { withOperatorShares } from '../../utils/operatorShares'
import { fetchRegistrationEvents, fetchRewardsEvents } from '../../utils/eventUtils'
import {
	AvsRegistrationEventQuerySchema,
	RewardsEventQuerySchema
} from '../../schema/zod/schemas/eventSchemas'
import { MinTvlQuerySchema } from '../../schema/zod/schemas/minTvlQuerySchema'
import { UpdateMetadataSchema } from '../../schema/zod/schemas/updateMetadata'
import { isAuthRequired } from '../../utils/authMiddleware'

/**
 * Function for route /avs
 * Returns a list of all AVSs with optional sorts, withTvl, withCuratedMetadata & text search
 *
 * @param req
 * @param res
 */
export async function getAllAVS(req: Request, res: Response) {
	// Validate pagination query
	const queryCheck = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(MinTvlQuerySchema)
		.and(SortByQuerySchema)
		.and(WithCuratedMetadata)
		.and(SearchByTextQuerySchema)
		.safeParse(req.query)

	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const {
			skip,
			take,
			withTvl,
			minTvl,
			withCuratedMetadata,
			sortByTvl,
			sortByTotalStakers,
			sortByTotalOperators,
			sortByApy,
			searchByText,
			searchMode
		} = queryCheck.data

		// Setup sort if applicable
		const sortConfig = sortByTotalStakers
			? { field: 'totalStakers', order: sortByTotalStakers }
			: sortByTotalOperators
			? { field: 'totalOperators', order: sortByTotalOperators }
			: sortByTvl
			? { field: 'tvlEth', order: sortByTvl }
			: sortByApy
			? { field: 'maxApy', order: sortByApy }
			: null

		// Setup search query
		const searchFilterQuery = getAvsSearchQuery(searchByText, searchMode, 'partial')

		// Fetch records and apply search/sort
		const avsRecords = await prisma.avs.findMany({
			where: {
				...getAvsFilterQuery(true),
				...searchFilterQuery,
				...(minTvl ? { tvlEth: { gte: minTvl } } : {})
			},
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
			},
			orderBy: sortConfig
				? { [sortConfig.field]: sortConfig.order }
				: searchByText
				? { tvlEth: 'desc' }
				: undefined,
			skip,
			take
		})

		// Fetch count
		const avsCount = await prisma.avs.count({
			where: {
				...getAvsFilterQuery(true),
				...searchFilterQuery,
				...(minTvl ? { tvlEth: { gte: minTvl } } : {})
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const data = await Promise.all(
			avsRecords.map(async (avs) => {
				const shares = withOperatorShares(avs.operators).filter(
					(s) => avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
				)

				return {
					...avs,
					curatedMetadata: withCuratedMetadata ? avs.curatedMetadata : undefined,
					totalOperators: avs.totalOperators,
					totalStakers: avs.totalStakers,
					shares,
					tvl: withTvl ? sharesToTVL(shares, strategiesWithSharesUnderlying) : undefined,
					operators: undefined,
					metadataUrl: undefined,
					isMetadataSynced: undefined,
					restakeableStrategies: undefined,
					tvlEth: undefined,
					sharesHash: undefined
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
 * Function for route /avs/addresses
 * Returns a list of all AVS, addresses & logos. Optionally perform a text search for a list of matched AVSs.
 *
 * @param req
 * @param res
 */
export async function getAllAVSAddresses(req: Request, res: Response) {
	// Validate pagination query
	const queryCheck = PaginationQuerySchema.and(SearchByTextQuerySchema).safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { skip, take, searchByText, searchMode } = queryCheck.data
		const searchFilterQuery = getAvsSearchQuery(searchByText, searchMode, 'full')

		// Fetch records
		const avsRecords = await prisma.avs.findMany({
			select: {
				address: true,
				metadataName: true,
				metadataLogo: true,
				curatedMetadata: {
					select: {
						metadataName: true,
						metadataLogo: true
					}
				}
			},
			where: {
				...getAvsFilterQuery(true),
				...searchFilterQuery
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
		const avsCount = await prisma.avs.count({
			where: {
				...getAvsFilterQuery(true),
				...searchFilterQuery
			}
		})

		const data = avsRecords.map((avs) => ({
			address: avs.address,
			name: avs.curatedMetadata?.metadataName || avs.metadataName,
			logo: avs.curatedMetadata?.metadataLogo || avs.metadataLogo
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
 * Function for route /avs/:address
 * Returns a single AVS by address
 *
 * @param req
 * @param res
 */
export async function getAVS(req: Request, res: Response) {
	// Validate query and params
	const queryCheck = WithTvlQuerySchema.and(WithCuratedMetadata)
		.and(WithRewardsQuerySchema)
		.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { withTvl, withCuratedMetadata, withRewards } = queryCheck.data

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: address.toLowerCase(), ...getAvsFilterQuery() },
			include: {
				curatedMetadata: withCuratedMetadata,
				rewardSubmissions: withRewards,
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

		const shares = withOperatorShares(avs.operators).filter(
			(s) => avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
		)

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		res.send({
			...avs,
			curatedMetadata: withCuratedMetadata ? avs.curatedMetadata : undefined,
			shares,
			totalOperators: avs.totalOperators,
			totalStakers: avs.totalStakers,
			tvl: withTvl ? sharesToTVL(shares, strategiesWithSharesUnderlying) : undefined,
			rewards: withRewards ? await calculateAvsApy(avs) : undefined,
			operators: undefined,
			metadataUrl: undefined,
			isMetadataSynced: undefined,
			restakeableStrategies: undefined,
			tvlEth: undefined,
			sharesHash: undefined,
			rewardSubmissions: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /avs/:address/stakers
 * Returns all stakers for a given AVS
 *
 * @param req
 * @param res
 * @returns
 */
export async function getAVSStakers(req: Request, res: Response) {
	// Validate query and params
	const queryCheck = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(UpdatedSinceQuerySchema)
		.safeParse(req.query)

	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { skip, take, withTvl, updatedSince } = queryCheck.data

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: address.toLowerCase(), ...getAvsFilterQuery() },
			include: { operators: true }
		})

		const operatorAddresses = avs.operators.filter((o) => o.isActive).map((o) => o.operatorAddress)

		const stakersCount = await prisma.staker.count({
			where: {
				...(updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}),
				operatorAddress: {
					in: operatorAddresses
				},
				shares: {
					some: {
						strategyAddress: {
							in: [...new Set(avs.operators.flatMap((o) => o.restakedStrategies))]
						},
						shares: { gt: '0' }
					}
				}
			}
		})

		const stakersRecords = await prisma.staker.findMany({
			where: {
				...(updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}),
				operatorAddress: { in: operatorAddresses },
				shares: {
					some: {
						strategyAddress: {
							in: [...new Set(avs.operators.flatMap((o) => o.restakedStrategies))]
						},
						shares: { gt: '0' }
					}
				}
			},
			skip,
			take,
			include: { shares: true }
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const stakers = stakersRecords.map((staker) => {
			const shares = staker.shares.filter(
				(s) => avs.restakeableStrategies.indexOf(s.strategyAddress) !== -1
			)

			return {
				...staker,
				shares,
				tvl: withTvl ? sharesToTVL(shares, strategiesWithSharesUnderlying) : undefined
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
 * Function for route /avs/:address/operators
 * Returns all Operators for a given AVS. Optionally perform a text search for a list of matched Operators.
 *
 * @param req
 * @param res
 * @returns
 */
export async function getAVSOperators(req: Request, res: Response) {
	// Validate query and params
	const queryCheck = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(MinTvlQuerySchema)
		.and(SortByQuerySchema)
		.and(SearchByTextQuerySchema)
		.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { skip, take, withTvl, minTvl, sortOperatorsByTvl, searchByText, searchMode } =
			queryCheck.data
		const searchFilterQuery = getOperatorSearchQuery(searchByText, searchMode, 'partial')

		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: address.toLowerCase(), ...getAvsFilterQuery() },
			include: {
				operators: {
					where: { isActive: true }
				}
			}
		})

		const operatorsRecords = await prisma.operator.findMany({
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				stakers: true
			},
			where: {
				AND: [
					{
						address: { in: avs.operators.map((o) => o.operatorAddress) }
					},
					{
						...searchFilterQuery
					},
					...(minTvl ? [{ tvlEth: { gte: minTvl } }] : [])
				] as Prisma.Prisma.OperatorWhereInput[]
			},
			orderBy: sortOperatorsByTvl
				? { tvlEth: sortOperatorsByTvl }
				: searchByText
				? { tvlEth: 'desc' }
				: undefined,
			skip,
			take
		})

		const total =
			searchByText || minTvl
				? await prisma.operator.count({
						where: {
							AND: [
								{
									address: { in: avs.operators.map((o) => o.operatorAddress) }
								},
								{
									...searchFilterQuery
								},
								...(minTvl ? [{ tvlEth: { gte: minTvl } }] : [])
							] as Prisma.Prisma.OperatorWhereInput[]
						}
				  })
				: avs.operators.length

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const data = operatorsRecords.map((operator) => {
			const avsOperator = avs.operators.find(
				(o) => o.operatorAddress.toLowerCase() === operator.address.toLowerCase()
			)

			const shares = operator.shares.filter(
				(s) => avsOperator?.restakedStrategies.indexOf(s.strategyAddress) !== -1
			)

			return {
				...operator,
				restakedStrategies: avsOperator?.restakedStrategies,
				shares,
				totalStakers: operator.stakers.length,
				tvl: withTvl ? sharesToTVL(shares, strategiesWithSharesUnderlying) : undefined,
				stakers: undefined,
				metadataUrl: undefined,
				isMetadataSynced: undefined,
				tvlEth: undefined,
				sharesHash: undefined
			}
		})

		res.send({
			data,
			meta: {
				total,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /avs/:address/rewards
 * Route to get a list of all rewards for a given Avs
 *
 * @param req
 * @param res
 * @returns
 */
export async function getAVSRewards(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params

		// Fetch RewardsV1 submissions for a given Avs
		const rewardsV1Submissions = await prisma.avsStrategyRewardSubmission.findMany({
			where: {
				avsAddress: address.toLowerCase()
			},
			orderBy: {
				startTimestamp: 'asc'
			}
		})

		// Fetch RewardsV2 submissions for a given Avs
		const rewardsV2Submissions = await prisma.operatorDirectedAvsStrategyRewardsSubmission.findMany(
			{
				where: {
					avsAddress: address.toLowerCase()
				},
				orderBy: {
					startTimestamp: 'asc'
				}
			}
		)

		const result: {
			address: string
			submissions: Submission[]
			totalRewards: number
			totalSubmissions: number
			rewardTokens: string[]
			rewardStrategies: string[]
		} = {
			address,
			submissions: [],
			totalRewards: 0,
			totalSubmissions: 0,
			rewardTokens: [],
			rewardStrategies: []
		}

		const tokenPrices = await fetchTokenPrices()
		const rewardTokens: Set<string> = new Set()
		const rewardStrategies: Set<string> = new Set()

		// Process RewardsV1 submissions
		const v1Submissions: Submission[] = []
		let v1SubmissionMap: { [hash: string]: Submission } = {}
		for (const submission of rewardsV1Submissions) {
			const hash = submission.rewardsSubmissionHash.toLowerCase()
			if (!v1SubmissionMap[hash]) {
				v1SubmissionMap[hash] = {
					rewardsSubmissionHash: hash,
					startTimestamp: Number(submission.startTimestamp),
					duration: submission.duration,
					totalAmount: '0',
					tokenAddress: submission.token.toLowerCase(),
					strategies: []
				}
				v1Submissions.push(v1SubmissionMap[hash])
			}

			const amount = submission.amount || new Prisma.Prisma.Decimal(0)
			v1SubmissionMap[hash].totalAmount = new Prisma.Prisma.Decimal(
				v1SubmissionMap[hash].totalAmount
			)
				.add(amount)
				.toFixed(0)

			const rewardTokenAddress = submission.token.toLowerCase()
			const strategyAddress = submission.strategyAddress.toLowerCase()
			rewardTokens.add(rewardTokenAddress)
			rewardStrategies.add(strategyAddress)

			let amountInEth = new Prisma.Prisma.Decimal(0)
			if (rewardTokenAddress) {
				const tokenPrice = tokenPrices.find((tp) => tp.address.toLowerCase() === rewardTokenAddress)
				amountInEth = amount
					.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18))
					.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
					.mul(new Prisma.Prisma.Decimal(10).pow(18)) // 18 decimals
			}

			v1SubmissionMap[hash].strategies.push({
				strategyAddress,
				multiplier: submission.multiplier?.toString() || '0',
				amount: amount.toFixed(0)
			})

			result.totalRewards += amountInEth.toNumber()
		}

		// Process RewardsV2 submissions
		const v2Submissions: Submission[] = []
		const v2SubmissionMap: {
			[hash: string]: {
				submission: Submission
				operators: {
					[address: string]: {
						totalAmount: Prisma.Prisma.Decimal
						strategies: { strategyAddress: string; amount: Prisma.Prisma.Decimal }[]
					}
				}
			}
		} = {}
		for (const submission of rewardsV2Submissions) {
			const hash = submission.operatorDirectedRewardsSubmissionHash.toLowerCase()
			if (!v2SubmissionMap[hash]) {
				v2SubmissionMap[hash] = {
					submission: {
						rewardsSubmissionHash: hash,
						startTimestamp: Number(submission.startTimestamp),
						duration: submission.duration,
						totalAmount: '0',
						tokenAddress: submission.token.toLowerCase(),
						strategies: [],
						operators: []
					},
					operators: {}
				}
				v2Submissions.push(v2SubmissionMap[hash].submission)
			}

			const amount = submission.amount || new Prisma.Prisma.Decimal(0)
			const operatorAddress = submission.operatorAddress.toLowerCase()
			const strategyAddress = submission.strategyAddress.toLowerCase()
			const rewardTokenAddress = submission.token.toLowerCase()

			// Aggregate operator data
			if (!v2SubmissionMap[hash].operators[operatorAddress]) {
				v2SubmissionMap[hash].operators[operatorAddress] = {
					totalAmount: new Prisma.Prisma.Decimal(0),
					strategies: []
				}
			}
			v2SubmissionMap[hash].operators[operatorAddress].totalAmount =
				v2SubmissionMap[hash].operators[operatorAddress].totalAmount.add(amount)

			// Track strategy-specific amounts for the operator
			let operatorStrategy = v2SubmissionMap[hash].operators[operatorAddress].strategies.find(
				(s) => s.strategyAddress === strategyAddress
			)
			if (!operatorStrategy) {
				operatorStrategy = { strategyAddress, amount: new Prisma.Prisma.Decimal(0) }
				v2SubmissionMap[hash].operators[operatorAddress].strategies.push(operatorStrategy)
			}
			operatorStrategy.amount = operatorStrategy.amount.add(amount)

			// Aggregate strategy amounts for submission
			let strategy = v2SubmissionMap[hash].submission.strategies.find(
				(s) => s.strategyAddress === strategyAddress
			)
			if (!strategy) {
				strategy = {
					strategyAddress,
					multiplier: submission.multiplier?.toString() || '0',
					amount: '0'
				}
				v2SubmissionMap[hash].submission.strategies.push(strategy)
			}
			strategy.amount = new Prisma.Prisma.Decimal(strategy.amount).add(amount).toFixed(0)

			v2SubmissionMap[hash].submission.totalAmount = new Prisma.Prisma.Decimal(
				v2SubmissionMap[hash].submission.totalAmount
			)
				.add(amount)
				.toFixed(0)

			rewardTokens.add(rewardTokenAddress)
			rewardStrategies.add(strategyAddress)

			let amountInEth = new Prisma.Prisma.Decimal(0)
			if (rewardTokenAddress) {
				const tokenPrice = tokenPrices.find((tp) => tp.address.toLowerCase() === rewardTokenAddress)
				amountInEth = amount
					.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18))
					.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
					.mul(new Prisma.Prisma.Decimal(10).pow(18)) // 18 decimals
			}
			result.totalRewards += amountInEth.toNumber()
		}

		// Populate operators for RewardsV2
		for (const hash in v2SubmissionMap) {
			v2SubmissionMap[hash].submission.operators = Object.entries(
				v2SubmissionMap[hash].operators
			).map(([operatorAddress, data]) => ({
				operatorAddress,
				totalAmount: data.totalAmount.toFixed(0),
				strategies: data.strategies.map((s) => s.strategyAddress),
				strategyAmounts: data.strategies.map((s) => s.amount.toFixed(0))
			}))
		}

		result.submissions = [...v1Submissions, ...v2Submissions].sort(
			(a, b) => a.startTimestamp - b.startTimestamp
		)
		result.totalSubmissions = result.submissions.length
		result.rewardTokens = Array.from(rewardTokens)
		result.rewardStrategies = Array.from(rewardStrategies)

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /avs/:address/events/rewards
 * Fetches and returns a list of rewards-related events for a specific AVS
 *
 * @param req
 * @param res
 */
export async function getAVSRewardsEvents(req: Request, res: Response) {
	const result = RewardsEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const {
			rewardsSubmissionToken,
			rewardsSubmissionHash,
			startAt,
			endAt,
			withEthValue,
			withIndividualAmount,
			skip,
			take
		} = result.data

		const response = await fetchRewardsEvents({
			avsAddress: address,
			rewardsSubmissionToken,
			rewardsSubmissionHash,
			startAt,
			endAt,
			withEthValue,
			withIndividualAmount,
			skip,
			take
		})

		response.eventRecords.forEach((event) => 'avs' in event.args && (event.args.avs = undefined))

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route avs/:address/events/registration
 * Fetches and returns a list of operator-avs registration event for a specific Avs
 *
 * @param req
 * @param res
 */
export async function getAvsRegistrationEvents(req: Request, res: Response) {
	const result = AvsRegistrationEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const { operatorAddress, txHash, status, startAt, endAt, skip, take } = result.data

		const response = await fetchRegistrationEvents({
			avsAddress: address,
			operatorAddress,
			txHash,
			status,
			startAt,
			endAt,
			skip,
			take
		})

		response.eventRecords.forEach((event) => 'avs' in event.args && (event.args.avs = undefined))

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /avs/:address/invalidate-metadata
 * Protected route to invalidate the metadata of a given AVS
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
		const accessLevel = isAuthRequired() ? req.accessLevel || 0 : 999

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const { address } = req.params

		const updateResult = await prisma.avs.updateMany({
			where: { address: address.toLowerCase() },
			data: { isMetadataSynced: false }
		})

		if (updateResult.count === 0) {
			throw new EigenExplorerApiError({ code: 'not_found', message: 'AVS address not found.' })
		}

		res.send({ message: 'Metadata invalidated successfully.' })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /avs/:address/create-metadata
 * Protected route to create a new curated metadata for a given AVS address
 *
 * @param req
 * @param res
 */
export async function createMetadata(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const bodyCheck = UpdateMetadataSchema.safeParse(req.body)
	if (!bodyCheck.success) {
		return handleAndReturnErrorResponse(req, res, bodyCheck.error)
	}

	try {
		const accessLevel = isAuthRequired() ? req.accessLevel || 0 : 999

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const { address } = req.params
		const metadataData = bodyCheck.data

		const existingRecord = await prisma.avsCuratedMetadata.findUnique({
			where: { avsAddress: address.toLowerCase() }
		})

		if (existingRecord) {
			throw new EigenExplorerApiError({
				code: 'bad_request',
				message: 'Metadata for this AVS already exists.'
			})
		}

		const avsExists = await prisma.avs.findUnique({
			where: { address: address.toLowerCase() }
		})

		if (!avsExists) {
			throw new EigenExplorerApiError({
				code: 'not_found',
				message: 'AVS not found.'
			})
		}

		const createData = {
			avsAddress: address.toLowerCase(),
			metadataName: metadataData.metadataName || null,
			metadataDescription: metadataData.metadataDescription || null,
			metadataDiscord: metadataData.metadataDiscord || null,
			metadataLogo: metadataData.metadataLogo || null,
			metadataTelegram: metadataData.metadataTelegram || null,
			metadataWebsite: metadataData.metadataWebsite || null,
			metadataX: metadataData.metadataX || null,
			metadataGithub: metadataData.metadataGithub || null,
			metadataTokenAddress: metadataData.metadataTokenAddress || null,
			additionalConfig: metadataData.additionalConfig || Prisma.Prisma.JsonNull,
			tags: metadataData.tags || [],
			isVisible: metadataData.isVisible !== undefined ? metadataData.isVisible : false,
			isVerified: metadataData.isVerified !== undefined ? metadataData.isVerified : false,
			metadatasUpdatedAt: Array(13).fill(new Date().getTime()) // 13 updateable fields
		}

		await prisma.avsCuratedMetadata.create({
			data: createData
		})

		res.send({ success: true })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /avs/:address/update-metadata
 * Protected route to update the curated metadata of a given AVS
 *
 * @param req
 * @param res
 */
export async function updateMetadata(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const bodyCheck = UpdateMetadataSchema.safeParse(req.body)
	if (!bodyCheck.success) {
		return handleAndReturnErrorResponse(req, res, bodyCheck.error)
	}

	try {
		const accessLevel = isAuthRequired() ? req.accessLevel || 0 : 999

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const { address } = req.params
		const updateData = bodyCheck.data

		const currentRecord = await prisma.avsCuratedMetadata.findUnique({
			where: { avsAddress: address.toLowerCase() }
		})

		if (!currentRecord) {
			throw new EigenExplorerApiError({ code: 'not_found', message: 'AVS address not found.' })
		}

		// Note: This is the order for the `metadatasUpdatedAt` array
		const metadataFields = [
			'metadataName',
			'metadataDescription',
			'metadataDiscord',
			'metadataLogo',
			'metadataTelegram',
			'metadataWebsite',
			'metadataX',
			'metadataGithub',
			'metadataTokenAddress',
			'additionalConfig',
			'tags',
			'isVisible',
			'isVerified'
		]

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const updateObj: any = {}
		const updatedAtTimestamps = [...(currentRecord.metadatasUpdatedAt || [])]

		// Ensure exact array length
		// 0n in the final array means the field has never been updated
		// and the record was created before introduction of `createMetadata` in the API spec
		while (updatedAtTimestamps.length < metadataFields.length) {
			updatedAtTimestamps.push(0n)
		}

		let hasChanges = false
		let updateCount = 0

		metadataFields.forEach((field, index) => {
			if (field in updateData) {
				let isChanged = false

				if (field === 'additionalConfig') {
					// JSON comparison
					if (updateData[field] === null && currentRecord[field] !== null) {
						isChanged = true
						updateObj[field] = Prisma.Prisma.JsonNull
					} else if (updateData[field] !== null && currentRecord[field] === null) {
						isChanged = true
						updateObj[field] = updateData[field]
					} else if (updateData[field] !== null && currentRecord[field] !== null) {
						isChanged = JSON.stringify(updateData[field]) !== JSON.stringify(currentRecord[field])
						if (isChanged) {
							updateObj[field] = updateData[field]
						}
					}
				} else if (field === 'tags') {
					// Array comparison
					if (updateData[field] === null && currentRecord[field] !== null) {
						isChanged = true
						updateObj[field] = []
					} else if (updateData[field] !== null) {
						isChanged = JSON.stringify(updateData[field]) !== JSON.stringify(currentRecord[field])
						if (isChanged) {
							updateObj[field] = updateData[field]
						}
					}
				} else {
					// Regular field comparison
					isChanged = updateData[field] !== currentRecord[field]
					if (isChanged) {
						updateObj[field] = updateData[field]
					}
				}

				if (isChanged) {
					updatedAtTimestamps[index] = BigInt(new Date().getTime())
					hasChanges = true
					updateCount++
				}
			}
		})

		if (!hasChanges) {
			return res.send({ updated: 0 })
		}

		updateObj.metadatasUpdatedAt = updatedAtTimestamps

		await prisma.avsCuratedMetadata.update({
			where: { avsAddress: address.toLowerCase() },
			data: updateObj
		})

		res.send({ updated: updateCount })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /avs/:address/delete-metadata
 * Protected route to delete the curated metadata of a given AVS
 *
 * @param req
 * @param res
 */
export async function deleteMetadata(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const accessLevel = isAuthRequired() ? req.accessLevel || 0 : 999

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const { address } = req.params

		const existingRecord = await prisma.avsCuratedMetadata.findUnique({
			where: { avsAddress: address.toLowerCase() }
		})

		if (!existingRecord) {
			throw new EigenExplorerApiError({
				code: 'not_found',
				message: 'Metadata for this AVS not found.'
			})
		}

		await prisma.avsCuratedMetadata.delete({
			where: { avsAddress: address.toLowerCase() }
		})

		res.send({ success: true })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Helper functions ---

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

	return {
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
}

export function getAvsSearchQuery(
	searchByText: string | undefined,
	searchMode: 'contains' | 'startsWith',
	searchScope: 'partial' | 'full'
) {
	if (!searchByText) return {}

	const searchConfig = { [searchMode]: searchByText, mode: 'insensitive' }

	if (searchScope === 'partial') {
		return {
			OR: [
				{ address: searchConfig },
				{ metadataName: searchConfig },
				{
					curatedMetadata: {
						is: {
							OR: [{ metadataName: searchConfig }]
						}
					}
				}
			] as Prisma.Prisma.AvsWhereInput[]
		}
	}

	return {
		OR: [
			{ address: searchConfig },
			{ metadataName: searchConfig },
			{ metadataDescription: searchConfig },
			{ metadataWebsite: searchConfig },
			{
				curatedMetadata: {
					is: {
						OR: [
							{ metadataName: searchConfig },
							{ metadataDescription: searchConfig },
							{ metadataWebsite: searchConfig }
						]
					}
				}
			}
		] as Prisma.Prisma.AvsWhereInput[]
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function calculateAvsApy(avs: any) {
	try {
		const strategyApyMap: Map<
			string,
			{
				apy: number
				tokens: Map<string, number>
			}
		> = new Map()

		const tokenPrices = await fetchTokenPrices()
		const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

		// Get share amounts for each restakeable strategy
		const shares = withOperatorShares(avs.operators).filter(
			(s) => avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
		)

		// Fetch the AVS tvl for each strategy
		const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)

		// Iterate through each strategy and calculate all its rewards
		for (const strategyAddress of avs.restakeableStrategies) {
			const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
			if (strategyTvl === 0) continue

			const tokenApyMap: Map<string, number> = new Map()
			const tokenRewards: Map<
				string,
				{
					totalRewardsEth: Prisma.Prisma.Decimal
					totalDuration: number
				}
			> = new Map()

			let strategyTotalRewardsEth = new Prisma.Prisma.Decimal(0)
			let strategyTotalDuration = 0

			// Find all reward submissions attributable to the strategy
			const relevantSubmissions = avs.rewardSubmissions.filter(
				(submission) => submission.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
			)

			// Calculate each reward amount for the strategy
			for (const submission of relevantSubmissions) {
				let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
				const rewardTokenAddress = submission.token.toLowerCase()

				// Normalize reward amount to its ETH price
				if (rewardTokenAddress) {
					const tokenPrice = tokenPrices.find(
						(tp) => tp.address.toLowerCase() === rewardTokenAddress
					)
					rewardIncrementEth = submission.amount
						.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
						.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18)) // No decimals
				}

				// Accumulate token-specific rewards and duration
				const tokenData = tokenRewards.get(rewardTokenAddress) || {
					totalRewardsEth: new Prisma.Prisma.Decimal(0),
					totalDuration: 0
				}
				tokenData.totalRewardsEth = tokenData.totalRewardsEth.add(rewardIncrementEth)
				tokenData.totalDuration += submission.duration
				tokenRewards.set(rewardTokenAddress, tokenData)

				// Accumulate strategy totals
				strategyTotalRewardsEth = strategyTotalRewardsEth.add(rewardIncrementEth)
				strategyTotalDuration += submission.duration
			}

			if (strategyTotalDuration === 0) continue

			// Calculate token APYs using accumulated values
			tokenRewards.forEach((data, tokenAddress) => {
				if (data.totalDuration !== 0) {
					const tokenRewardRate = data.totalRewardsEth.toNumber() / strategyTvl
					const tokenAnnualizedRate = tokenRewardRate * ((365 * 24 * 60 * 60) / data.totalDuration)
					const tokenApy = tokenAnnualizedRate * 100

					tokenApyMap.set(tokenAddress, tokenApy)
				}
			})

			// Calculate overall strategy APY summing token APYs
			const strategyApy = Array.from(tokenApyMap.values()).reduce((sum, apy) => sum + apy, 0)

			// Update strategy rewards map
			const currentStrategyRewards = {
				apy: 0,
				tokens: new Map()
			}

			tokenApyMap.forEach((apy, tokenAddress) => {
				currentStrategyRewards.tokens.set(tokenAddress, apy)
			})
			currentStrategyRewards.apy += strategyApy
			strategyApyMap.set(strategyAddress, currentStrategyRewards)
		}

		return {
			strategyApys: Array.from(strategyApyMap.entries()).map(([strategyAddress, data]) => {
				return {
					strategyAddress,
					apy: data.apy,
					tokens: Array.from(data.tokens.entries()).map(([tokenAddress, apy]) => ({
						tokenAddress,
						apy
					}))
				}
			})
		}
	} catch {}
}
