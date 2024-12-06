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
import { RequestHeadersSchema } from '../../schema/zod/schemas/auth'
import { getOperatorSearchQuery } from '../operators/operatorController'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL,
	sharesToTVLStrategies
} from '../../utils/strategyShares'
import Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { withOperatorShares } from '../../utils/operatorShares'

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
			? { field: 'apy', order: sortByApy }
			: null

		// Setup search query
		const searchFilterQuery = getAvsSearchQuery(searchByText, searchMode, 'partial')

		// Fetch records and apply search/sort
		const avsRecords = await prisma.avs.findMany({
			where: {
				...getAvsFilterQuery(true),
				...searchFilterQuery
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
				...searchFilterQuery
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
		const { skip, take, withTvl, sortOperatorsByTvl, searchByText, searchMode } = queryCheck.data
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
					}
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

		const total = searchByText
			? await prisma.operator.count({
					where: {
						AND: [
							{
								address: { in: avs.operators.map((o) => o.operatorAddress) }
							},
							{
								...searchFilterQuery
							}
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

		// Fetch all rewards submissions for a given Avs
		const rewardsSubmissions = await prisma.avsStrategyRewardSubmission.findMany({
			where: {
				avsAddress: address.toLowerCase()
			},
			orderBy: {
				rewardsSubmissionHash: 'asc'
			}
		})

		if (!rewardsSubmissions || rewardsSubmissions.length === 0) {
			throw new Error('AVS not found.')
		}

		const tokenPrices = await fetchTokenPrices()

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

		const rewardTokens: string[] = []
		const rewardStrategies: string[] = []
		let currentSubmission: Submission | null = null
		let currentTotalAmount = new Prisma.Prisma.Decimal(0)
		let currentTotalAmountEth = new Prisma.Prisma.Decimal(0)

		// Iterate over each rewards submission by the Avs
		for (const submission of rewardsSubmissions) {
			if (
				!currentSubmission ||
				currentSubmission.rewardsSubmissionHash !== submission.rewardsSubmissionHash
			) {
				if (currentSubmission) {
					currentSubmission.totalAmount = currentTotalAmount.toFixed(0)
					result.submissions.push(currentSubmission)
					result.totalSubmissions++
				}
				currentSubmission = {
					rewardsSubmissionHash: submission.rewardsSubmissionHash,
					startTimestamp: Number(submission.startTimestamp),
					duration: submission.duration,
					totalAmount: '0',
					tokenAddress: submission.token,
					strategies: []
				}
				currentTotalAmount = new Prisma.Prisma.Decimal(0)
				result.totalRewards += currentTotalAmountEth.toNumber()
				currentTotalAmountEth = new Prisma.Prisma.Decimal(0)
			}

			const amount = submission.amount || new Prisma.Prisma.Decimal(0)
			currentTotalAmount = currentTotalAmount.add(amount)

			const rewardTokenAddress = submission.token.toLowerCase()
			const strategyAddress = submission.strategyAddress.toLowerCase()

			// Document reward token & rewarded strategy addresses
			if (!rewardTokens.includes(rewardTokenAddress)) rewardTokens.push(rewardTokenAddress)
			if (!rewardStrategies.includes(strategyAddress)) rewardStrategies.push(strategyAddress)

			if (rewardTokenAddress) {
				const tokenPrice = tokenPrices.find((tp) => tp.address.toLowerCase() === rewardTokenAddress)
				const amountInEth = amount
					.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18))
					.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
					.mul(new Prisma.Prisma.Decimal(10).pow(18)) // 18 decimals
				currentTotalAmountEth = currentTotalAmountEth.add(amountInEth)
			}

			currentSubmission.strategies.push({
				strategyAddress,
				multiplier: submission.multiplier?.toString() || '0',
				amount: amount.toFixed(0)
			})
		}

		// Add final submission
		if (currentSubmission) {
			currentSubmission.totalAmount = currentTotalAmount.toFixed(0)
			result.submissions.push(currentSubmission)
			result.totalSubmissions++
			result.totalRewards += currentTotalAmountEth.toNumber() // 18 decimals
		}

		result.rewardTokens = rewardTokens
		result.rewardStrategies = rewardStrategies

		res.send(result)
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

	const headerCheck = RequestHeadersSchema.safeParse(req.headers)
	if (!headerCheck.success) {
		return handleAndReturnErrorResponse(req, res, headerCheck.error)
	}

	try {
		const apiToken = headerCheck.data['X-API-Token']
		const authToken = process.env.EE_AUTH_TOKEN

		if (!apiToken || apiToken !== authToken) {
			throw new Error('Unauthorized access.')
		}

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

				// Multiply reward amount in ETH by the strategy weight
				rewardIncrementEth = rewardIncrementEth
					.mul(submission.multiplier)
					.div(new Prisma.Prisma.Decimal(10).pow(18))

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
