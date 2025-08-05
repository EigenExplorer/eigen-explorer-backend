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
import { EigenExplorerApiError, handleAndReturnErrorResponse } from '../../schema/errors'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL,
	sharesToTVLStrategies
} from '../../utils/strategyShares'
import { getLatestActiveOperatorSplits, withOperatorShares } from '../../utils/operatorShares'
import Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { fetchDelegationEvents, fetchRegistrationEvents } from '../../utils/eventUtils'
import { MinTvlQuerySchema } from '../../schema/zod/schemas/minTvlQuerySchema'
import { WithTrailingApySchema } from '../../schema/zod/schemas/withTrailingApySchema'
import {
	buildOperatorAvsRegistrationMap,
	getDailyAvsStrategyTvl
} from '../../utils/trailingApyUtils'
import { fetchBaseApys } from '../../utils/baseApys'
import pLimit from 'p-limit'

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
		.and(WithRewardsQuerySchema)
		.and(WithTrailingApySchema)
		.and(MinTvlQuerySchema)
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
		withRewards,
		withTrailingApy,
		minTvl,
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
				...searchFilterQuery,
				...(minTvl ? { tvlEth: { gte: minTvl } } : {})
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
				...searchFilterQuery,
				...(minTvl ? { tvlEth: { gte: minTvl } } : {})
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const rewardsMap =
			withRewards || withTrailingApy
				? await calculateOperatorApyForAll(operatorRecords, withTrailingApy)
				: {}

		const splits = await prisma.operatorAvsSplit.findMany({
			where: {
				operatorAddress: {
					in: operatorRecords.map((op) => op.address)
				},
				activatedAt: {
					lte: Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)
				}
			},
			orderBy: {
				activatedAt: 'desc'
			}
		})
		const activeSplitsMap = getLatestActiveOperatorSplits(splits)

		const operators = operatorRecords.map((operator) => {
			const avsRegistrations = operator.avs.map(({ avsAddress, isActive }) => ({
				avsAddress,
				isActive,
				...(isActive && {
					operatorSplitPercent: activeSplitsMap[operator.address]?.[avsAddress] ?? 10
				})
			}))

			return {
				...operator,
				avsRegistrations,
				totalStakers: operator.totalStakers,
				totalAvs: operator.totalAvs,
				tvl: withTvl ? sharesToTVL(operator.shares, strategiesWithSharesUnderlying) : undefined,
				rewards: withRewards || withTrailingApy ? rewardsMap[operator.address] : undefined,
				metadataUrl: undefined,
				isMetadataSynced: undefined,
				avs: undefined,
				tvlEth: undefined,
				sharesHash: undefined
			}
		})

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
		.and(WithTrailingApySchema)
		.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { withTvl, withAvsData, withRewards, withTrailingApy } = result.data

	try {
		const { address } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				avs: {
					select: {
						avsAddress: true,
						isActive: true,
						...(withAvsData || withRewards || withTrailingApy
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
											...(withRewards || withTrailingApy
												? {
														address: true,
														maxApy: true,
														rewardSubmissions: true,
														operatorDirectedRewardSubmissions: true,
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

		const splits = await prisma.operatorAvsSplit.findMany({
			where: {
				operatorAddress: operator.address,
				activatedAt: {
					lte: Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)
				}
			},
			orderBy: {
				activatedAt: 'desc'
			}
		})

		const activeSplitsMap = getLatestActiveOperatorSplits(splits)

		const avsRegistrations = operator.avs.map(({ avsAddress, isActive, avs }) => {
			const operatorAddress = operator.address

			return {
				avsAddress,
				isActive,
				...(isActive && {
					operatorSplitPercent: activeSplitsMap[operatorAddress]?.[avsAddress] ?? 10
				}),
				...(withAvsData && avs ? { ...avs, operators: undefined } : {})
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const rewardsMap =
			withRewards || withTrailingApy
				? await calculateOperatorApyForAll([operator], withTrailingApy)
				: {}

		res.send({
			...operator,
			avsRegistrations,
			totalStakers: operator.totalStakers,
			totalAvs: operator.totalAvs,
			tvl: withTvl ? sharesToTVL(operator.shares, strategiesWithSharesUnderlying) : undefined,
			rewards: withRewards || withTrailingApy ? rewardsMap[operator.address] : undefined,
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
								rewardSubmissions: true,
								operatorDirectedRewardSubmissions: true
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

			for (const submission of avs.operatorDirectedRewardSubmissions) {
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

	try {
		const accessLevel = req.accessLevel || 0

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
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
async function calculateOperatorApy(
	operator: any,
	avsWithEligibleRewardSubmissions: {
		avs: any
		eligibleRewards: any[]
		status: boolean
	}[],
	withTrailingApy: boolean,
	tokenPriceMap: Map<string, any>,
	baseApyMap: Map<string, number>,
	avsRegistrationByDay: Record<string, any>,
	dailyTvlMap: Record<string, any>,
	splitMap: Map<string, { activatedAt: bigint; splitBips: number }[]>,
	startDate: Date,
	endDate: Date,
	avsTvlMap: Map<string, Record<string, number>>
) {
	try {
		const avsApyMap: Map<
			string,
			{
				avsAddress: string
				maxApy: number
				strategyApys: {
					strategyAddress: string
					apy: number
					baseApy: number
					trailingApy7d?: number
					trailingApy30d?: number
					trailingApy3m?: number
					trailingApy6m?: number
					trailingApy1y?: number
					tokens: {
						tokenAddress: string
						apy: number
					}[]
				}[]
			}
		> = new Map()
		const operatorStrategyTvlMap: Map<string, bigint> = new Map()
		operator.shares.forEach((share) =>
			operatorStrategyTvlMap.set(share.strategyAddress.toLowerCase(), BigInt(share.shares))
		)

		for (const { avs, eligibleRewards, status } of avsWithEligibleRewardSubmissions) {
			const avsAddressLower = avs.address.toLowerCase()
			const strategyApyMap: Map<
				string,
				{
					apy: number
					baseApy: number
					trailingApy7d?: number
					trailingApy30d?: number
					trailingApy3m?: number
					trailingApy6m?: number
					trailingApy1y?: number
					tokens: Map<string, number>
				}
			> = new Map()

			// Use precomputed AVS TVL
			const tvlStrategiesEth = avsTvlMap.get(avsAddressLower) || {}

			// Process strategies for Current and Trailing APY
			for (const strategyAddress of avs.restakeableStrategies || []) {
				const strategyAddressLower = strategyAddress.toLowerCase()

				if (
					!operatorStrategyTvlMap.has(strategyAddressLower) ||
					operatorStrategyTvlMap.get(strategyAddressLower) === 0n
				) {
					continue
				}

				const strategyTvl = tvlStrategiesEth[strategyAddressLower] || 0
				if (strategyTvl === 0) continue

				// Filter eligibleRewards by strategy; validate duration and timestamp
				const relevantSubmissions = eligibleRewards.filter(
					(submission) => submission.strategyAddress.toLowerCase() === strategyAddressLower
				)

				if (!relevantSubmissions || relevantSubmissions.length === 0) continue

				const tokenApyMap: Map<string, number> = new Map()
				const tokenRewards: Map<
					string,
					{
						totalRewardsEth: Prisma.Prisma.Decimal
						timeSegments: { start: number; end: number }[]
					}
				> = new Map()
				const dailyRewardsByDay: { [day: string]: Prisma.Prisma.Decimal } = {}

				// Process submissions for both Current and Trailing APY
				for (const submission of relevantSubmissions) {
					let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
					const rewardTokenAddress = submission.token.toLowerCase()

					// Normalize reward amount to its ETH price
					if (rewardTokenAddress) {
						const tokenPrice = tokenPriceMap.get(rewardTokenAddress)

						// Apply operator commission from splitMap
						const key = `${operator.address.toLowerCase()}:${avsAddressLower}`
						const splits = splitMap.get(key) || []
						const validSplit = splits
							.filter((split) => split.activatedAt <= submission.startTimestamp)
							.sort((a, b) => Number(b.activatedAt) - Number(a.activatedAt))[0]
						const operatorSplit = validSplit ? validSplit.splitBips / 100 : 10

						rewardIncrementEth = submission.amount
							.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
							.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18))
							.mul(100 - operatorSplit)
							.div(100)
					}

					// Current APY: Accumulate only for active AVSs
					// Accumulate token-specific rewards and duration
					const tokenData = tokenRewards.get(rewardTokenAddress) || {
						totalRewardsEth: new Prisma.Prisma.Decimal(0),
						timeSegments: []
					}
					tokenData.totalRewardsEth = status
						? tokenData.totalRewardsEth.add(rewardIncrementEth)
						: new Prisma.Prisma.Decimal(0)
					tokenData.timeSegments.push({
						start: Number(submission.startTimestamp),
						end: Number(submission.startTimestamp) + submission.duration
					})
					tokenRewards.set(rewardTokenAddress, tokenData)

					// Trailing APY: Distribute daily rewards if requested
					if (withTrailingApy) {
						const startTime = new Date(Number(submission.startTimestamp) * 1000)
						const durationDays = submission.duration / 86400
						if (durationDays <= 0) continue

						const dailyRewardEth = rewardIncrementEth.div(new Prisma.Prisma.Decimal(durationDays))

						const endTime = new Date(startTime)
						endTime.setDate(endTime.getDate() + Math.floor(durationDays) - 1)
						for (
							let day = new Date(Math.max(startTime.getTime(), startDate.getTime()));
							day <= endTime && day <= endDate;
							day.setDate(day.getDate() + 1)
						) {
							const dayKey = day.toISOString().split('T')[0]
							if (!dailyRewardsByDay[dayKey]) {
								dailyRewardsByDay[dayKey] = new Prisma.Prisma.Decimal(0)
							}
							dailyRewardsByDay[dayKey] = dailyRewardsByDay[dayKey].add(dailyRewardEth)
						}
					}
				}

				// Calculate token APYs for Current APY, only for active AVSs
				let strategyApy = 0
				tokenRewards.forEach((data, tokenAddress) => {
					if (data.timeSegments.length === 0) return

					const sortedSegments = data.timeSegments.sort((a, b) => a.start - b.start)
					const mergedSegments: { start: number; end: number }[] = []

					let currentSegment = sortedSegments[0]
					for (let i = 1; i < sortedSegments.length; i++) {
						const nextSegment = sortedSegments[i]
						if (nextSegment.start <= currentSegment.end) {
							// Overlapping: extend current segment
							currentSegment.end = Math.max(currentSegment.end, nextSegment.end)
						} else {
							// Non-overlapping: push current and start new segment
							mergedSegments.push(currentSegment)
							currentSegment = nextSegment
						}
					}
					mergedSegments.push(currentSegment)

					// Calculate total duration from merged segments
					const totalDuration = mergedSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
					if (totalDuration !== 0) {
						const tokenRewardRate = data.totalRewardsEth.toNumber() / strategyTvl
						const tokenAnnualizedRate = tokenRewardRate * ((365 * 24 * 60 * 60) / totalDuration)
						const tokenApy = tokenAnnualizedRate * 100
						tokenApyMap.set(tokenAddress, tokenApy)
						strategyApy += tokenApy
					}
				})

				const baseApy = baseApyMap.get(strategyAddressLower) || 0

				// Initialize strategy data
				const strategyData = {
					apy: strategyApy,
					baseApy,
					tokens: tokenApyMap
				}

				// Calculate Trailing APY if requested, for both active and non-active AVSs
				if (withTrailingApy) {
					// Define timeframe boundaries
					const timeframes = [
						{ days: 7, key: 'trailingApy7d' },
						{ days: 30, key: 'trailingApy30d' },
						{ days: 90, key: 'trailingApy3m' },
						{ days: 180, key: 'trailingApy6m' },
						{ days: 365, key: 'trailingApy1y' }
					]
					const timeframeStarts: { [key: string]: Date } = {}
					const trailingSums: { [key: string]: number } = {}
					timeframes.forEach(({ key, days }) => {
						const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
						start.setUTCHours(0, 0, 0, 0)
						timeframeStarts[key] = start
						trailingSums[key] = 0
					})

					// Calculate daily APY and accumulate for relevant timeframes
					for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
						const dayKey = day.toISOString().split('T')[0]
						const isRegistered = avsRegistrationByDay[dayKey]?.[avsAddressLower] || false
						if (!isRegistered) continue

						const dailyTvl = dailyTvlMap[dayKey]?.[avsAddressLower]?.[strategyAddressLower] || 0
						if (dailyTvl === 0) continue

						const dailyStrategyRewardsEth =
							dailyRewardsByDay[dayKey] || new Prisma.Prisma.Decimal(0)

						if (dailyStrategyRewardsEth.greaterThan(0)) {
							const dailyApy = dailyStrategyRewardsEth.div(dailyTvl).mul(100).toNumber()
							if (dailyApy > 1000) continue
							timeframes.forEach(({ key }) => {
								if (day >= timeframeStarts[key]) {
									trailingSums[key] += dailyApy
								}
							})
						}
					}

					// Annualize trailing APYs
					timeframes.forEach(({ key, days }) => {
						const annualizationFactor = new Prisma.Prisma.Decimal(365).div(days)
						strategyData[key] = new Prisma.Prisma.Decimal(trailingSums[key])
							.mul(annualizationFactor)
							.toNumber()
					})
				}

				strategyApyMap.set(strategyAddressLower, strategyData)
			}

			if (strategyApyMap.size > 0) {
				avsApyMap.set(avs.address, {
					avsAddress: avs.address,
					maxApy: Math.max(...Array.from(strategyApyMap.values()).map((data) => data.apy)),
					strategyApys: Array.from(strategyApyMap.entries()).map(([strategyAddress, data]) => ({
						strategyAddress,
						apy: data.apy,
						baseApy: data.baseApy,
						trailingApy7d: data.trailingApy7d,
						trailingApy30d: data.trailingApy30d,
						trailingApy3m: data.trailingApy3m,
						trailingApy6m: data.trailingApy6m,
						trailingApy1y: data.trailingApy1y,
						tokens: Array.from(data.tokens.entries()).map(([tokenAddress, apy]) => ({
							tokenAddress,
							apy
						}))
					}))
				})
			}
		}

		return Array.from(avsApyMap.values())
	} catch {}
}

async function calculateOperatorApyForAll(operators: any[], withTrailingApy: boolean = false) {
	try {
		const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
		startDate.setUTCHours(0, 0, 0, 0)
		const endDate = new Date()
		endDate.setUTCHours(0, 0, 0, 0)
		const pastYearStartSec = Math.floor(startDate.getTime() / 1000)

		// Pre-fetch shared data
		const [tokenPrices, strategiesWithSharesUnderlying, baseApys, avsWithRewards] =
			await Promise.all([
				fetchTokenPrices(),
				getStrategiesWithShareUnderlying(),
				fetchBaseApys(),
				prisma.avs.findMany({
					where: {
						OR: [
							{
								rewardSubmissions: { some: { startTimestamp: { gte: BigInt(pastYearStartSec) } } }
							},
							{
								operatorDirectedRewardSubmissions: {
									some: { startTimestamp: { gte: BigInt(pastYearStartSec) } }
								}
							}
						]
					},
					select: {
						address: true,
						rewardSubmissions: {
							where: { startTimestamp: { gte: BigInt(pastYearStartSec) } }
						},
						operatorDirectedRewardSubmissions: {
							where: { startTimestamp: { gte: BigInt(pastYearStartSec) } }
						},
						restakeableStrategies: true,
						operators: {
							where: { isActive: true },
							include: {
								operator: {
									include: { shares: true }
								}
							}
						}
					}
				})
			])

		const tokenPriceMap = new Map(tokenPrices.map((tp) => [tp.address.toLowerCase(), tp]))
		const baseApyMap = new Map(baseApys.map((ba) => [ba.strategyAddress.toLowerCase(), ba.apy]))

		// Build avsSet and operatorAvsMap
		const avsSet = new Set<string>()
		const avsTvlMap = new Map<string, Record<string, number>>()

		avsWithRewards.forEach((avs) => {
			const avsAddress = avs.address.toLowerCase()
			avsSet.add(avsAddress)
		})

		// Build avsWithEligibleRewardSubmissionsMap
		const avsWithEligibleRewardSubmissionsMap = new Map<
			string,
			{ avs: any; eligibleRewards: any[]; status: boolean }[]
		>()
		avsWithRewards.forEach((avs) => {
			const avsAddress = avs.address.toLowerCase()
			const eligibleRewards = [...avs.rewardSubmissions, ...avs.operatorDirectedRewardSubmissions]
			avsWithEligibleRewardSubmissionsMap.set(avsAddress, [
				{
					avs,
					eligibleRewards,
					status: avs.operators.some((op) => op.isActive)
				}
			])

			// Precompute AVS TVL
			const shares = withOperatorShares(avs.operators).filter(
				(s) => avs.restakeableStrategies?.indexOf(s.strategyAddress.toLowerCase()) !== -1
			)
			const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)
			avsTvlMap.set(avsAddress, tvlStrategiesEth)
		})

		// Build avsStrategyPairs for TVL
		let dailyTvlMap: Record<string, any> = {}
		if (withTrailingApy) {
			const avsStrategyPairs = avsWithRewards.flatMap((avs) => {
				const eligibleRewards = [
					...(avs.rewardSubmissions || []),
					...(avs.operatorDirectedRewardSubmissions || [])
				]
				const eligibleStrategyAddresses = new Set(
					eligibleRewards.map((r) => r.strategyAddress.toLowerCase())
				)
				const filteredStrategies = (avs.restakeableStrategies || [])
					.map((s) => s.toLowerCase())
					.filter((strategyAddress) => eligibleStrategyAddresses.has(strategyAddress))
				return filteredStrategies.map((strategyAddress) => ({
					avsAddress: avs.address.toLowerCase(),
					strategyAddress
				}))
			})
			dailyTvlMap = await getDailyAvsStrategyTvl(avsStrategyPairs, startDate, endDate)
		}

		// Fetch operator splits
		const operatorAvsSplits = await prisma.operatorAvsSplit.findMany({
			where: {
				operatorAddress: {
					in: operators.map((op) => op.address.toLowerCase())
				},
				avsAddress: {
					in: Array.from(avsSet)
				}
			},
			orderBy: [{ activatedAt: 'desc' }]
		})

		const splitMap: Map<string, { activatedAt: bigint; splitBips: number }[]> = new Map()
		operatorAvsSplits.forEach((split) => {
			const key = `${split.operatorAddress.toLowerCase()}:${split.avsAddress.toLowerCase()}`
			if (!splitMap.has(key)) {
				splitMap.set(key, [])
			}
			splitMap.get(key)!.push({
				activatedAt: split.activatedAt,
				splitBips: split.splitBips
			})
		})

		// Process each operator with p-limit
		const limit = pLimit(20)
		const operatorResults = await Promise.all(
			operators.map(async (operator) =>
				limit(async () => {
					if (!operator?.shares?.length) {
						return {
							...operator,
							rewards: []
						}
					}

					const operatorStrategyTvlMap: Map<string, bigint> = new Map()
					operator.shares.forEach((share) =>
						operatorStrategyTvlMap.set(share.strategyAddress.toLowerCase(), BigInt(share.shares))
					)

					// Filter relevant AVSs using operator.avs
					const avsWithEligibleRewardSubmissions = operator.avs
						.filter((avsOp) => avsSet.has(avsOp.avsAddress.toLowerCase()))
						.flatMap((avsOp) =>
							avsWithEligibleRewardSubmissionsMap
								.get(avsOp.avsAddress.toLowerCase())!
								.map((item) => ({
									...item,
									eligibleRewards: item.eligibleRewards.filter(
										(reward) =>
											(operatorStrategyTvlMap.get(reward.strategyAddress.toLowerCase()) ?? 0n) >
												0n &&
											(!reward.operatorAddress ||
												reward.operatorAddress.toLowerCase() === operator.address.toLowerCase())
									),
									status: avsOp.isActive
								}))
						)
						.filter((item) => item.eligibleRewards.length > 0)

					if (!avsWithEligibleRewardSubmissions.length) {
						return {
							...operator,
							rewards: []
						}
					}

					// Fetch AVS registration data for this operator
					let avsRegistrationByDay: Record<string, any> = {}
					if (withTrailingApy) {
						const avsOperators = avsWithEligibleRewardSubmissions.map((item) => ({
							avsAddress: item.avs.address,
							isActive: item.status
						}))
						avsRegistrationByDay = await buildOperatorAvsRegistrationMap(
							operator.address.toLowerCase(),
							avsOperators,
							startDate,
							endDate
						)
					}

					// Process APY
					const rewards = await calculateOperatorApy(
						operator,
						avsWithEligibleRewardSubmissions,
						withTrailingApy,
						tokenPriceMap,
						baseApyMap,
						avsRegistrationByDay,
						dailyTvlMap,
						splitMap,
						startDate,
						endDate,
						avsTvlMap
					)

					return {
						address: operator.address,
						rewards
					}
				})
			)
		)

		return Object.fromEntries(operatorResults.map((op) => [op.address.toLowerCase(), op.rewards]))
	} catch {}
}
