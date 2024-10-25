import type { Request, Response } from 'express'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { WithAdditionalDataQuerySchema } from '../../schema/zod/schemas/withAdditionalDataQuery'
import { SortByQuerySchema } from '../../schema/zod/schemas/sortByQuery'
import { SearchByTextQuerySchema } from '../../schema/zod/schemas/searchByTextQuery'
import { WithRewardsQuerySchema } from '../../schema/zod/schemas/withRewardsQuery'
import { OperatorEventQuerySchema } from '../../schema/zod/schemas/operatorEvents'
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

type EventRecordArgs = {
	staker: string
	strategy?: string
	shares?: number
}

type EventRecord = {
	type: 'SHARES_INCREASED' | 'SHARES_DECREASED' | 'DELEGATION' | 'UNDELEGATION'
	tx: string
	blockNumber: number
	blockTime: Date
	args: EventRecordArgs
	underlyingToken?: string
	underlyingValue?: number
	ethValue?: number
}

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
			? { field: 'apy', order: sortByApy }
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
	// Validate pagination query
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
			...(withAvsData && registration.avs ? registration.avs : {})
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
 * Function for route /operators/:address/events
 * Fetches and returns a list of events for a specific operator with optional filters
 *
 * @param req
 * @param res
 */
export async function getOperatorEvents(req: Request, res: Response) {
	const result = OperatorEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	try {
		const {
			type,
			stakerAddress,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data
		const { address } = req.params

		const baseFilterQuery = {
			operator: {
				contains: address,
				mode: 'insensitive'
			},
			...(stakerAddress && {
				staker: {
					contains: stakerAddress,
					mode: 'insensitive'
				}
			}),
			...(strategyAddress && {
				strategy: {
					contains: strategyAddress,
					mode: 'insensitive'
				}
			}),
			...(txHash && {
				transactionHash: {
					contains: txHash,
					mode: 'insensitive'
				}
			}),
			blockTime: {
				gte: new Date(startAt),
				...(endAt ? { lte: new Date(endAt) } : {})
			}
		}

		let eventRecords: EventRecord[] = []
		let eventCount = 0

		const eventTypesToFetch = type
			? [type]
			: strategyAddress
			? ['SHARES_INCREASED', 'SHARES_DECREASED']
			: ['SHARES_INCREASED', 'SHARES_DECREASED', 'DELEGATION', 'UNDELEGATION']

		const fetchEventsForTypes = async (types: string[]) => {
			const results = await Promise.all(
				types.map((eventType) =>
					fetchAndMapEvents(eventType, baseFilterQuery, withTokenData, withEthValue, skip, take)
				)
			)
			return results
		}

		const results = await fetchEventsForTypes(eventTypesToFetch)

		eventRecords = results.flatMap((result) => result.eventRecords)
		eventRecords = eventRecords
			.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1))
			.slice(0, take)

		eventCount = results.reduce((acc, result) => acc + result.eventCount, 0)

		const response = {
			data: eventRecords,
			meta: {
				total: eventCount,
				skip,
				take
			}
		}

		res.send(response)
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
		const avsRewardsMap: Map<string, number> = new Map()
		const strategyRewardsMap: Map<string, number> = new Map()

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

		if (!avsWithEligibleRewardSubmissions) {
			return {
				avs: [],
				strategies: [],
				aggregateApy: 0,
				operatorEarningsEth: 0
			}
		}

		let operatorEarningsEth = new Prisma.Prisma.Decimal(0)

		const tokenPrices = await fetchTokenPrices()
		const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

		// Calc aggregate APY for each AVS basis the opted-in strategies
		for (const avs of avsWithEligibleRewardSubmissions) {
			let aggregateApy = 0

			// Get share amounts for each restakeable strategy
			const shares = withOperatorShares(avs.avs.operators).filter(
				(s) => avs.avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
			)

			// Fetch the AVS tvl for each strategy
			const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)

			// Iterate through each strategy and calculate all its rewards
			for (const strategyAddress of optedStrategyAddresses) {
				const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
				if (strategyTvl === 0) continue

				let totalRewardsEth = new Prisma.Prisma.Decimal(0)
				let totalDuration = 0

				// Find all reward submissions attributable to the strategy
				const relevantSubmissions = avs.eligibleRewards.filter(
					(submission) => submission.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
				)

				for (const submission of relevantSubmissions) {
					let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
					const rewardTokenAddress = submission.token.toLowerCase()

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

					// Operator takes 10% in commission
					const operatorFeesEth = rewardIncrementEth.mul(10).div(100) // No decimals

					operatorEarningsEth = operatorEarningsEth.add(
						operatorFeesEth.mul(new Prisma.Prisma.Decimal(10).pow(18))
					) // 18 decimals

					totalRewardsEth = totalRewardsEth.add(rewardIncrementEth).sub(operatorFeesEth) // No decimals
					totalDuration += submission.duration
				}

				if (totalDuration === 0) continue

				// Annualize the reward basis its duration to find yearly APY
				const rewardRate = totalRewardsEth.toNumber() / strategyTvl // No decimals
				const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
				const apy = annualizedRate * 100
				aggregateApy += apy

				// Add strategy's APY to common strategy rewards store (across all Avs)
				const currentStrategyApy = strategyRewardsMap.get(strategyAddress) || 0
				strategyRewardsMap.set(strategyAddress, currentStrategyApy + apy)
			}
			// Add aggregate APY to Avs rewards store
			avsRewardsMap.set(avs.avs.address, aggregateApy)
		}

		const response = {
			avs: Array.from(avsRewardsMap, ([avsAddress, apy]) => ({
				avsAddress,
				apy
			})),
			strategies: Array.from(strategyRewardsMap, ([strategyAddress, apy]) => ({
				strategyAddress,
				apy
			})),
			aggregateApy: 0,
			operatorEarningsEth: new Prisma.Prisma.Decimal(0)
		}

		// Calculate aggregates across Avs and strategies
		response.aggregateApy = response.avs.reduce((sum, avs) => sum + avs.apy, 0)
		response.operatorEarningsEth = operatorEarningsEth

		return response
	} catch {}
}

/**
 * Utility function to fetch and map event records from the database.
 *
 * @param eventType
 * @param baseFilterQuery
 * @param skip
 * @param take
 * @returns
 */
async function fetchAndMapEvents(
	eventType: string,
	baseFilterQuery: any,
	withTokenData: boolean,
	withEthValue: boolean,
	skip: number,
	take: number
): Promise<{ eventRecords: EventRecord[]; eventCount: number }> {
	const modelName = (() => {
		switch (eventType) {
			case 'SHARES_INCREASED':
				return 'eventLogs_OperatorSharesIncreased'
			case 'SHARES_DECREASED':
				return 'eventLogs_OperatorSharesDecreased'
			case 'DELEGATION':
				return 'eventLogs_StakerDelegated'
			case 'UNDELEGATION':
				return 'eventLogs_StakerUndelegated'
			default:
				throw new Error(`Unknown event type: ${eventType}`)
		}
	})()

	const model = prisma[modelName] as any

	const eventCount = await model.count({
		where: baseFilterQuery
	})

	const eventLogs = await model.findMany({
		where: baseFilterQuery,
		skip,
		take,
		orderBy: { blockNumber: 'desc' }
	})

	const strategiesWithSharesUnderlying = withTokenData
		? await getStrategiesWithShareUnderlying()
		: undefined

	const eventRecords = await Promise.all(
		eventLogs.map(async (event) => {
			let underlyingToken: string | undefined
			let underlyingValue: number | undefined
			let ethValue: number | undefined

			if (
				withTokenData &&
				(eventType === 'SHARES_INCREASED' || eventType === 'SHARES_DECREASED') &&
				event.strategy
			) {
				const strategy = await prisma.strategies.findUnique({
					where: {
						address: event.strategy.toLowerCase()
					}
				})

				if (strategy && strategiesWithSharesUnderlying) {
					underlyingToken = strategy.underlyingToken

					const sharesUnderlying = strategiesWithSharesUnderlying.find(
						(s) => s.strategyAddress.toLowerCase() === event.strategy.toLowerCase()
					)

					if (sharesUnderlying) {
						underlyingValue =
							Number(
								(BigInt(event.shares) * BigInt(sharesUnderlying.sharesToUnderlying)) / BigInt(1e18)
							) / 1e18

						if (withEthValue && sharesUnderlying.ethPrice) {
							ethValue = underlyingValue * sharesUnderlying.ethPrice
						}
					}
				}
			}

			return {
				type: eventType,
				tx: event.transactionHash,
				blockNumber: event.blockNumber,
				blockTime: event.blockTime,
				args: {
					staker: event.staker.toLowerCase(),
					strategy: event.strategy?.toLowerCase(),
					shares: event.shares
				},
				...(withTokenData && {
					underlyingToken: underlyingToken?.toLowerCase(),
					underlyingValue
				}),
				...(withEthValue && { ethValue })
			}
		})
	)

	return {
		eventRecords,
		eventCount
	}
}
