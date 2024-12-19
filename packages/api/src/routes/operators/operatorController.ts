import type { Request, Response } from 'express'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { WithAdditionalDataQuerySchema } from '../../schema/zod/schemas/withAdditionalDataQuery'
import { SortByQuerySchema } from '../../schema/zod/schemas/sortByQuery'
import { SearchByTextQuerySchema } from '../../schema/zod/schemas/searchByTextQuery'
import { WithRewardsQuerySchema } from '../../schema/zod/schemas/withRewardsQuery'
import {
	OperatorDelegationEventQuerySchema,
	OperatorRegistrationEventQuerySchema
} from '../../schema/zod/schemas/eventSchemas'
import { RequestHeadersSchema } from '../../schema/zod/schemas/auth'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL,
	sharesToTVLStrategies
} from '../../utils/strategyShares'
import { withOperatorShares } from '../../utils/operatorShares'
import Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { fetchDelegationEvents, fetchRegistrationEvents } from '../../utils/eventUtils'

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
		sortByApy,
		searchByText
	} = result.data

	const searchFilterQuery = getOperatorSearchQuery(searchByText, 'contains', 'partial')

	try {
		// Setup sort if applicable
		const sortConfig = sortByTotalStakers
			? { field: 'totalStakers', order: sortByTotalStakers }
			: sortByTotalAvs
			? { field: 'totalAvs', order: sortByTotalAvs }
			: sortByTvl
			? { field: 'tvlEth', order: sortByTvl }
			: sortByApy
			? { field: 'maxApy', order: sortByApy }
			: null

		// Fetch records and apply search/sort
		const operatorRecords = await prisma.operator.findMany({
			where: {
				...searchFilterQuery
			},
			include: {
				avs: {
					select: { avsAddress: true, isActive: true }
				},
				shares: {
					select: { strategyAddress: true, shares: true }
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

		// Count records
		const operatorCount = await prisma.operator.count({
			where: {
				...searchFilterQuery
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const operators = operatorRecords.map((operator) => ({
			...operator,
			avsRegistrations: operator.avs,
			totalStakers: operator.totalStakers,
			totalAvs: operator.totalAvs,
			tvl: withTvl ? sharesToTVL(operator.shares, strategiesWithSharesUnderlying) : undefined,
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
	const result = WithTvlQuerySchema.and(WithAdditionalDataQuerySchema)
		.and(WithRewardsQuerySchema)
		.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { withTvl, withAvsData, withRewards } = result.data

	try {
		const { address } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				avs: {
					select: {
						avsAddress: true,
						isActive: true,
						...(withAvsData || withRewards
							? {
									avs: {
										select: {
											...(withAvsData
												? {
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
												: {}),
											...(withRewards
												? {
														address: true,
														maxApy: true,
														rewardSubmissions: true,
														restakeableStrategies: true,
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
												: {})
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
			...(withAvsData && registration.avs ? { ...registration.avs, operators: undefined } : {})
		}))

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		res.send({
			...operator,
			avsRegistrations,
			totalStakers: operator.totalStakers,
			totalAvs: operator.totalAvs,
			tvl: withTvl ? sharesToTVL(operator.shares, strategiesWithSharesUnderlying) : undefined,
			rewards: withRewards ? await calculateOperatorApy(operator) : undefined,
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
 * Function for route /operators/addresses
 * Returns a list of all Operators, addresses & logos. Optionally perform a text search for a list of matched Operators.
 *
 * @param req
 * @param res
 */
export async function getAllOperatorAddresses(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(SearchByTextQuerySchema).safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	try {
		const { skip, take, searchByText, searchMode } = result.data
		const searchFilterQuery = getOperatorSearchQuery(searchByText, searchMode, 'full')

		// Fetch records
		const operatorRecords = await prisma.operator.findMany({
			select: {
				address: true,
				metadataName: true,
				metadataLogo: true
			},
			where: {
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
		const operatorCount = await prisma.operator.count({
			where: {
				...searchFilterQuery
			}
		})

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
 * Function for route /operators/:address/rewards
 * Returns a list of strategies that the Operator is rewarded for, and the tokens they're rewarded in
 *
 * @param req
 * @param res
 * @returns
 */
export async function getOperatorRewards(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params

		// Fetch Operator data
		const operator = await prisma.operator.findUnique({
			where: { address: address.toLowerCase() },
			include: {
				avs: {
					include: {
						avs: {
							include: {
								rewardSubmissions: true
							}
						}
					}
				},
				shares: true
			}
		})

		if (!operator) {
			throw new Error('Operator not found.')
		}

		const result: {
			address: string
			rewardTokens: Set<string>
			rewardStrategies: Set<string>
		} = {
			address,
			rewardTokens: new Set<string>(),
			rewardStrategies: new Set<string>()
		}

		// Create a Set of strategies where the operator has positive TVL
		const operatorActiveStrategies = new Set(
			operator.shares
				.filter((share) => new Prisma.Prisma.Decimal(share.shares).gt(0))
				.map((share) => share.strategyAddress.toLowerCase())
		)

		// Iterate through all Avs
		for (const avsOperator of operator.avs) {
			const avs = avsOperator.avs

			// Iterate through all reward submissions
			for (const submission of avs.rewardSubmissions) {
				result.rewardTokens.add(submission.token.toLowerCase())

				if (operatorActiveStrategies.has(submission.strategyAddress.toLowerCase())) {
					result.rewardStrategies.add(submission.strategyAddress.toLowerCase())
				}
			}
		}

		res.send({
			address: result.address,
			rewardTokens: Array.from(result.rewardTokens),
			rewardStrategies: Array.from(result.rewardStrategies)
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /operators/:address/events/delegation
 * Fetches and returns a list of delegation-related events for a specific operator
 *
 * @param req
 * @param res
 */
export async function getOperatorDelegationEvents(req: Request, res: Response) {
	const result = OperatorDelegationEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const {
			type,
			strategyAddress,
			stakerAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data

		const response = await fetchDelegationEvents({
			operatorAddress: address,
			stakerAddress,
			type,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		})

		response.eventRecords.forEach(
			(event) => 'operator' in event.args && (event.args.operator = undefined)
		)

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route operators/:address/events/registration
 * Fetches and returns a list of operator-avs registration event for a specific operator
 *
 * @param req
 * @param res
 */
export async function getOperatorRegistrationEvents(req: Request, res: Response) {
	const result = OperatorRegistrationEventQuerySchema.and(PaginationQuerySchema).safeParse(
		req.query
	)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const { avsAddress, txHash, status, startAt, endAt, skip, take } = result.data

		const response = await fetchRegistrationEvents({
			operatorAddress: address,
			avsAddress,
			txHash,
			status,
			startAt,
			endAt,
			skip,
			take
		})

		response.eventRecords.forEach(
			(event) => 'operator' in event.args && (event.args.operator = undefined)
		)

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
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

// --- Helper functions ---

export function getOperatorSearchQuery(
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
				{ metadataName: searchConfig }
			] as Prisma.Prisma.OperatorWhereInput[]
		}
	}

	return {
		OR: [
			{ address: searchConfig },
			{ metadataName: searchConfig },
			{ metadataDescription: searchConfig },
			{ metadataWebsite: searchConfig }
		] as Prisma.Prisma.OperatorWhereInput[]
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function calculateOperatorApy(operator: any) {
	try {
		const avsApyMap: Map<
			string,
			{
				avsAddress: string
				maxApy: number
				strategyApys: {
					strategyAddress: string
					apy: number
					tokens: {
						tokenAddress: string
						apy: number
					}[]
				}[]
			}
		> = new Map()

		const tokenPrices = await fetchTokenPrices()
		const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

		// Grab the all reward submissions that the Operator is eligible for basis opted strategies & AVSs
		const optedStrategyAddresses: Set<string> = new Set(
			operator?.shares.map((share) => share.strategyAddress.toLowerCase())
		)
		const avsWithEligibleRewardSubmissions = operator?.avs
			.filter((avsOp) => avsOp.avs.rewardSubmissions.length > 0)
			.map((avsOp) => ({
				avs: avsOp.avs,
				eligibleRewards: avsOp.avs.rewardSubmissions.filter((reward) =>
					optedStrategyAddresses.has(reward.strategyAddress.toLowerCase())
				)
			}))
			.filter((item) => item.eligibleRewards.length > 0)

		if (!avsWithEligibleRewardSubmissions || avsWithEligibleRewardSubmissions.length === 0)
			return []

		for (const avs of avsWithEligibleRewardSubmissions) {
			const strategyApyMap: Map<
				string,
				{
					apy: number
					tokens: Map<string, number>
				}
			> = new Map()

			const shares = withOperatorShares(avs.avs.operators).filter(
				(s) => avs.avs.restakeableStrategies?.indexOf(s.strategyAddress.toLowerCase()) !== -1
			)

			// Fetch the AVS tvl for each strategy
			const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)

			// Iterate through each strategy and calculate all its rewards
			for (const strategyAddress of avs.avs.restakeableStrategies) {
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

				// Find all reward submissions for the strategy
				const relevantSubmissions = avs.avs.rewardSubmissions.filter(
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
							.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18))
					}

					// Apply operator commission (90% of rewards)
					rewardIncrementEth = rewardIncrementEth
						.mul(submission.multiplier)
						.div(new Prisma.Prisma.Decimal(10).pow(18))
						.mul(90)
						.div(100)

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

				// Calculate token APYs
				tokenRewards.forEach((data, tokenAddress) => {
					if (data.totalDuration !== 0) {
						const tokenRewardRate = data.totalRewardsEth.toNumber() / strategyTvl
						const tokenAnnualizedRate =
							tokenRewardRate * ((365 * 24 * 60 * 60) / data.totalDuration)
						const tokenApy = tokenAnnualizedRate * 100

						tokenApyMap.set(tokenAddress, tokenApy)
					}
				})

				// Calculate overall strategy APY
				const strategyApy = Array.from(tokenApyMap.values()).reduce((sum, apy) => sum + apy, 0)
				if (strategyApy > 0) {
					strategyApyMap.set(strategyAddress, {
						apy: strategyApy,
						tokens: tokenApyMap
					})
				}
			}

			avsApyMap.set(avs.avs.address, {
				avsAddress: avs.avs.address,
				maxApy: avs.avs.maxApy,
				strategyApys: Array.from(strategyApyMap.entries()).map(([strategyAddress, data]) => ({
					strategyAddress,
					apy: data.apy,
					tokens: Array.from(data.tokens.entries()).map(([tokenAddress, apy]) => ({
						tokenAddress,
						apy
					}))
				}))
			})
		}

		return Array.from(avsApyMap.values())
	} catch {}
}
