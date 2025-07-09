import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import Prisma from '@prisma/client'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { getViemClient } from '../../viem/viemClient'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL,
	sharesToTVLStrategies
} from '../../utils/strategyShares'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { withOperatorShares } from '../../utils/operatorShares'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { UpdatedSinceQuerySchema } from '../../schema/zod/schemas/updatedSinceQuery'
import { WithRewardsQuerySchema } from '../../schema/zod/schemas/withRewardsQuery'
import { ActiveQuerySchema } from '../../schema/zod/schemas/activeQuery'
import {
	fetchDelegationEvents,
	fetchDepositEvents,
	fetchStakerWithdrawalEvents
} from '../../utils/eventUtils'
import {
	StakerDelegationEventQuerySchema,
	DepositEventQuerySchema,
	WithdrawalEventQuerySchema
} from '../../schema/zod/schemas/eventSchemas'
import { doGetTvlStrategy, doGetTvl, doGetTvlBeaconChain } from '../metrics/metricController'
import { fetchBaseApys } from '../../utils/baseApys'

/**
 * Route to get a list of all stakers
 *
 * @param req
 * @param res
 */
export async function getAllStakers(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(WithTvlQuerySchema)
		.and(UpdatedSinceQuerySchema)
		.and(ActiveQuerySchema)
		.safeParse(req.query)

	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take, withTvl, updatedSince, active } = result.data

	try {
		// Fetch count and record
		const stakersCount = await prisma.staker.count({
			where: {
				...(updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}),
				...(active
					? {
							shares: {
								some: {
									shares: {
										not: '0'
									}
								}
							}
					  }
					: {})
			}
		})

		const stakersRecords = await prisma.staker.findMany({
			skip,
			take,
			where: {
				...(updatedSince ? { updatedAt: { gte: new Date(updatedSince) } } : {}),
				...(active
					? {
							shares: {
								some: {
									shares: {
										not: '0'
									}
								}
							}
					  }
					: {})
			},
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			}
		})

		const strategiesWithSharesUnderlying = withTvl ? await getStrategiesWithShareUnderlying() : []

		const stakers = stakersRecords.map((staker) => ({
			...staker,
			tvl: withTvl ? sharesToTVL(staker.shares, strategiesWithSharesUnderlying) : undefined
		}))

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
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getStaker(req: Request, res: Response) {
	const result = WithTvlQuerySchema.and(WithRewardsQuerySchema).safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { withTvl, withRewards } = result.data

	try {
		const { address } = req.params

		const staker = await prisma.staker.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				},
				...(withRewards
					? {
							operator: {
								include: {
									avs: {
										select: {
											avsAddress: true,
											isActive: true,
											avs: {
												select: {
													address: true,
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
											}
										}
									},
									shares: { select: { strategyAddress: true, shares: true } }
								}
							}
					  }
					: {})
			}
		})

		const strategiesWithSharesUnderlying =
			withTvl || withRewards ? await getStrategiesWithShareUnderlying() : []
		const tvl = withTvl ? sharesToTVL(staker.shares, strategiesWithSharesUnderlying) : undefined
		const tvlStrategiesEth =
			withTvl || withRewards
				? sharesToTVLStrategies(staker.shares, strategiesWithSharesUnderlying)
				: null

		res.send({
			...staker,
			tvl,
			rewards:
				withRewards && tvlStrategiesEth
					? await calculateStakerRewards(staker, tvlStrategiesEth)
					: undefined,
			operator: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawals(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				isCompleted: !!withdrawal.completedWithdrawal,
				updatedAt: withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				updatedAtBlock: withdrawal.completedWithdrawal?.createdAtBlock || withdrawal.createdAtBlock
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsQueued(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address.toLowerCase(), completedWithdrawal: null }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsWithdrawable(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params

		const viemClient = getViemClient()
		const minDelayBlocks = await prisma.settings.findUnique({
			where: { key: 'withdrawMinDelayBlocks' }
		})
		const minDelayBlock =
			(await viemClient.getBlockNumber()) - BigInt((minDelayBlocks?.value as string) || 0)

		const filterQuery = {
			stakerAddress: address.toLowerCase(),
			completedWithdrawal: null,
			createdAtBlock: { lte: minDelayBlock }
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsCompleted(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = {
			stakerAddress: address.toLowerCase(),
			NOT: {
				completedWithdrawal: null
			}
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				updatedAt: withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				updatedAtBlock: withdrawal.completedWithdrawal?.createdAtBlock || withdrawal.createdAtBlock
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerDeposits(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address.toLowerCase() }

		const depositCount = await prisma.deposit.count({
			where: filterQuery
		})
		const depositRecords = await prisma.deposit.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = depositRecords.map((deposit) => {
			return {
				...deposit
			}
		})

		res.send({
			data,
			meta: {
				total: depositCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /stakers/:address/events/delegation
 * Fetches and returns a list of delegation-related events for a specific staker
 *
 * @param req
 * @param res
 */
export async function getStakerDelegationEvents(req: Request, res: Response) {
	const result = StakerDelegationEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const {
			type,
			strategyAddress,
			operatorAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data

		const response = await fetchDelegationEvents({
			stakerAddress: address,
			operatorAddress,
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
			(event) => 'staker' in event.args && (event.args.staker = undefined)
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
 * Function for route /stakers/:address/events/deposit
 * Fetches and returns a list of deposit-related events for a specific staker
 *
 * @param req
 * @param res
 */
export async function getStakerDepositEvents(req: Request, res: Response) {
	const result = DepositEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const {
			tokenAddress,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data

		const response = await fetchDepositEvents({
			stakerAddress: address,
			tokenAddress,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		})

		response.eventRecords.forEach((event) => {
			if ('staker' in event.args) {
				event.args.staker = undefined
			}
		})

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /stakers/:address/events/withdrawal
 * Fetches and returns a list of withdrawal-related events for a specific staker with optional filters
 *
 * @param req
 * @param res
 */
export async function getStakerWithdrawalEvents(req: Request, res: Response) {
	const result = WithdrawalEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const { address } = req.params

		const {
			type,
			txHash,
			startAt,
			endAt,
			withdrawalRoot,
			delegatedTo,
			withdrawer,
			skip,
			take,
			withTokenData,
			withEthValue
		} = result.data

		const response = await fetchStakerWithdrawalEvents({
			stakerAddress: address,
			type,
			txHash,
			startAt,
			endAt,
			withdrawalRoot,
			delegatedTo,
			withdrawer,
			skip,
			take,
			withTokenData,
			withEthValue
		})

		response.eventRecords.forEach(
			(event) => 'staker' in event.args && (event.args.staker = undefined)
		)

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Helper functions ---

async function calculateStakerRewards(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	staker: any,
	stakerTvlStrategiesEth: { [strategyAddress: string]: number }
) {
	try {
		const avsApyMap: Map<
			string,
			{
				strategies: {
					address: string
					apy: number
					tvlEth: number
					tokens: Map<string, number>
				}[]
			}
		> = new Map()
		const strategyApyMap: Map<
			string,
			{
				apy: number
				baseApy: number
				tvlEth: number
				tokens: Map<string, number>
			}
		> = new Map()

		const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
		startDate.setUTCHours(0, 0, 0, 0)
		const endDate = new Date()
		endDate.setUTCHours(0, 0, 0, 0)

		const eigenStrategyAddress =
			process.env.NETWORK === 'holesky'
				? '0x43252609bff8a13dfe5e057097f2f45a24387a84'
				: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'

		// Grab the all reward submissions that the Staker is eligible for basis opted strategies & the Operator's opted AVSs
		const operatorStrategyAddresses: Set<string> = new Set(
			staker.operator?.shares.map((share) => share.strategyAddress.toLowerCase()) || []
		)

		const optedStrategyAddresses: Set<string> = new Set(
			Array.from(operatorStrategyAddresses).filter(
				(strategyAddress) => Number(stakerTvlStrategiesEth[strategyAddress]) > 0
			)
		)

		// Filter AVS with reward submissions
		const avsWithRewards = staker.operator?.avs.filter(
			(avsOp) =>
				avsOp.avs.rewardSubmissions.length > 0 ||
				avsOp.avs.operatorDirectedRewardSubmissions.length > 0
		)

		if (!avsWithRewards || avsWithRewards.length === 0)
			return {
				aggregateApy: '0',
				nativeApy: '0',
				tokenAmounts: [],
				strategyApys: [],
				avsApys: []
			}

		const pastYearStartSec = Math.floor(startDate.getTime() / 1000)
		// Filter AVS with eligible rewards
		const isEligibleReward = (reward: any) => {
			const endTimeSec = reward.startTimestamp + BigInt(reward.duration)
			return (
				optedStrategyAddresses.has(reward.strategyAddress.toLowerCase()) &&
				endTimeSec >= BigInt(pastYearStartSec) &&
				(!reward.operatorAddress ||
					reward.operatorAddress.toLowerCase() === staker.operator?.address.toLowerCase())
			)
		}

		const avsWithEligibleRewardSubmissions = avsWithRewards
			.map((avsOp) => ({
				avs: avsOp.avs,
				eligibleRewards: [
					// Filter for rewardSubmissions based on strategy address
					...avsOp.avs.rewardSubmissions.filter(isEligibleReward),
					// Filter for operatorDirectedRewardSubmissions based on strategy address and operator address
					...avsOp.avs.operatorDirectedRewardSubmissions.filter(isEligibleReward)
				],
				status: avsOp.isActive
			}))
			.filter((item) => item.eligibleRewards.length > 0)

		if (!avsWithEligibleRewardSubmissions || avsWithEligibleRewardSubmissions.length === 0)
			return {
				aggregateApy: '0',
				nativeApy: '0',
				tokenAmounts: [],
				strategyApys: [],
				avsApys: []
			}

		const [
			tokenPrices,
			strategiesWithSharesUnderlying,
			baseApys,
			operatorAvsSplits,
			foundEigenStrategy,
			stakerRewardRecords
		] = await Promise.all([
			fetchTokenPrices(),
			getStrategiesWithShareUnderlying(),
			fetchBaseApys(),
			await prisma.operatorAvsSplit.findMany({
				where: {
					operatorAddress: staker.operator?.address.toLowerCase(),
					avsAddress: {
						in: avsWithEligibleRewardSubmissions.map(({ avs }) => avs.address.toLowerCase())
					}
				},
				orderBy: [{ activatedAt: 'desc' }]
			}),
			await prisma.strategies.findUnique({
				where: { address: eigenStrategyAddress.toLowerCase() }
			}),
			await prisma.stakerRewardSnapshot.findMany({
				where: {
					stakerAddress: staker.address.toLowerCase()
				}
			})
		])

		const tokenPriceMap = new Map(tokenPrices.map((tp) => [tp.address.toLowerCase(), tp]))
		const baseApyMap = new Map(baseApys.map((ba) => [ba.strategyAddress.toLowerCase(), ba.apy]))

		// Create a lookup for splitBips
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

		// Function to get splitBips for a given operator, AVS, and timestamp
		const getSplit = (operatorAddress: string, avsAddress: string, timestamp: bigint): number => {
			const key = `${operatorAddress.toLowerCase()}:${avsAddress.toLowerCase()}`
			const splits = splitMap.get(key) || []
			const validSplit = splits
				.filter((split) => split.activatedAt <= timestamp)
				.sort((a, b) => Number(b.activatedAt) - Number(a.activatedAt))[0]
			return validSplit ? validSplit.splitBips / 100 : 10 // Default to 10%
		}

		if (!avsWithEligibleRewardSubmissions) {
			return {
				aggregateApy: '0',
				nativeApy: '0',
				tokenAmounts: [],
				strategyApys: [],
				avsApys: []
			}
		}

		// Calculate totalTvlEth for the staker
		const stakerTotalTvlEth = Object.values(stakerTvlStrategiesEth).reduce(
			(sum, tvl) => sum + tvl,
			0
		)
		const stakerEigenTvlEth = Number(
			stakerTvlStrategiesEth[eigenStrategyAddress.toLowerCase()] || 0
		)
		const stakerEthLstTvlEth = stakerTotalTvlEth - stakerEigenTvlEth

		if (!foundEigenStrategy) {
			throw new Error(`EIGEN strategy not found for address: ${eigenStrategyAddress}`)
		}

		const tvlEigenResponse = await doGetTvlStrategy(
			foundEigenStrategy.address as `0x${string}`,
			foundEigenStrategy.underlyingToken as `0x${string}`,
			false
		)
		const totalTvlEigenStrategy = tvlEigenResponse.tvlEth as number

		// Fetch Total TVL (Restaking + Beacon Chain)
		const tvlRestaking = (await doGetTvl(false)).tvlRestaking
		const tvlBeaconChain = await doGetTvlBeaconChain(false)
		const totalTvlEthNetwork = (tvlRestaking as number) + (tvlBeaconChain as number)

		// Calculate Total TVL ETH/LST
		const totalTvlEthLst = totalTvlEthNetwork - totalTvlEigenStrategy
		const eigenTokenAddress =
			process.env.NETWORK === 'holesky'
				? '0x275ccf9be51f4a6c94aba6114cdf2a4c45b9cb27'
				: '0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83'
		const eigenTokenPrice = tokenPriceMap.get(eigenTokenAddress.toLowerCase())

		const operatorPiSplit = (100 - (staker.operator?.piSplitBips ?? 1000) / 100) / 100

		// EIGEN Strategy PI
		const piWeeklyEigenTokens = new Prisma.Prisma.Decimal(321855)
		const eigenTokenAmount =
			totalTvlEigenStrategy > 0
				? piWeeklyEigenTokens.mul(operatorPiSplit).mul(stakerEigenTvlEth).div(totalTvlEigenStrategy)
				: new Prisma.Prisma.Decimal(0)

		// ETH/LST Strategies PI
		const piWeeklyEthLstTokens = new Prisma.Prisma.Decimal(965565)
		const ethLstTokenAmount =
			totalTvlEthLst > 0
				? piWeeklyEthLstTokens.mul(operatorPiSplit).mul(stakerEthLstTvlEth).div(totalTvlEthLst)
				: new Prisma.Prisma.Decimal(0)

		// Calculate Native APY
		const totalPiTokenAmount = eigenTokenAmount.add(ethLstTokenAmount) // Total weekly tokens
		const totalPiEth = totalPiTokenAmount.mul(
			new Prisma.Prisma.Decimal(eigenTokenPrice?.ethPrice ?? 0)
		) // Convert to value in ETH

		const totalPiProfitEth = totalPiEth.mul(52) // Annualize

		const nativeApy =
			stakerTotalTvlEth > 0 ? totalPiProfitEth.div(stakerTotalTvlEth).mul(100).toNumber() : 0

		// Calc aggregate APY for each AVS basis the opted-in strategies
		for (const { avs, eligibleRewards, status } of avsWithEligibleRewardSubmissions) {
			const avsAddressLower = avs.address.toLowerCase()

			// Get share amounts for each restakeable strategy
			const shares = withOperatorShares(avs.operators).filter(
				(s) => avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
			)

			// Fetch the AVS tvl for each strategy
			const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)

			// Iterate through each strategy and calculate all its rewards
			for (const strategyAddress of optedStrategyAddresses) {
				const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
				if (strategyTvl === 0) continue

				const tokenApyMap: Map<string, number> = new Map()
				const tokenRewards: Map<
					string,
					{
						totalRewardsEth: Prisma.Prisma.Decimal
						timeSegments: { start: number; end: number }[]
					}
				> = new Map()

				let strategyTotalRewardsEth = new Prisma.Prisma.Decimal(0)
				let strategyTotalDuration = 0

				// Find all reward submissions attributable to the strategy
				const relevantSubmissions = eligibleRewards.filter(
					(submission) => submission.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
				)

				for (const submission of relevantSubmissions) {
					let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
					const rewardTokenAddress = submission.token.toLowerCase()

					if (rewardTokenAddress) {
						const tokenPrice = tokenPriceMap.get(rewardTokenAddress)

						// Apply operator commission from OperatorAvsSplit
						const operatorSplit = getSplit(
							staker.operator?.address,
							avsAddressLower,
							submission.startTimestamp
						)
						rewardIncrementEth = submission.amount
							.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
							.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18))
							.mul(100 - operatorSplit)
							.div(100)
					}

					// Accumulate token-specific rewards and duration
					const tokenData = tokenRewards.get(rewardTokenAddress) || {
						totalRewardsEth: new Prisma.Prisma.Decimal(0),
						timeSegments: []
					}
					tokenData.totalRewardsEth = status
						? tokenData.totalRewardsEth.add(rewardIncrementEth)
						: (tokenData.totalRewardsEth = new Prisma.Prisma.Decimal(0))
					tokenData.timeSegments.push({
						start: Number(submission.startTimestamp),
						end: Number(submission.startTimestamp) + submission.duration
					})
					tokenRewards.set(rewardTokenAddress, tokenData)

					// Accumulate strategy totals
					strategyTotalRewardsEth = strategyTotalRewardsEth.add(rewardIncrementEth)
					strategyTotalDuration += submission.duration
				}

				if (strategyTotalDuration === 0) continue

				// Calculate token APYs using accumulated values
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
					}
				})

				// Calculate overall strategy APY summing token APYs
				const strategyApy = Array.from(tokenApyMap.values()).reduce((sum, apy) => sum + apy, 0)
				const baseApy = baseApyMap.get(strategyAddress) || 0

				// Update strategy rewards map (across all AVSs)
				const currentStrategyRewards = strategyApyMap.get(strategyAddress) || {
					apy: 0,
					baseApy,
					tvlEth: strategyTvl,
					tokens: new Map()
				}

				tokenApyMap.forEach((apy, tokenAddress) => {
					const currentTokenApy = currentStrategyRewards.tokens.get(tokenAddress) || 0
					currentStrategyRewards.tokens.set(tokenAddress, currentTokenApy + apy)
				})
				currentStrategyRewards.apy += strategyApy
				strategyApyMap.set(strategyAddress, currentStrategyRewards)

				// Update AVS rewards map
				const currentAvsRewards = avsApyMap.get(avsAddressLower) || { strategies: [] }
				currentAvsRewards.strategies.push({
					address: strategyAddress,
					tvlEth: strategyTvl,
					apy: strategyApy,
					tokens: tokenApyMap
				})
				avsApyMap.set(avsAddressLower, currentAvsRewards)
			}
		}

		// Build token amounts section
		const tokenAmounts = stakerRewardRecords.map((record) => ({
			tokenAddress: record.tokenAddress.toLowerCase(),
			cumulativeAmount: record.cumulativeAmount
		}))

		// Build strategies section
		const strategyApys = Array.from(strategyApyMap).map(([strategyAddress, data]) => ({
			strategyAddress,
			apy: data.apy,
			baseApy: data.baseApy,
			tokens: Array.from(data.tokens.entries()).map(([tokenAddress, apy]) => ({
				tokenAddress,
				apy
			}))
		}))

		// Build Avs section
		const avsApys = Array.from(avsApyMap).map(([avsAddress, data]) => {
			const strategies = data.strategies.map((s) => ({
				strategyAddress: s.address,
				apy: s.apy,
				tokens: Array.from(s.tokens).map(([tokenAddress, apy]) => ({
					tokenAddress,
					apy
				}))
			}))

			const totalTvl = strategies.reduce(
				(sum, s) => sum + Number(stakerTvlStrategiesEth[s.strategyAddress.toLowerCase()] || 0),
				0
			)
			const weightedApy = strategies.reduce((sum, s) => {
				const tvl = Number(stakerTvlStrategiesEth[s.strategyAddress.toLowerCase()] || 0)
				return sum + Number(s.apy) * (tvl / totalTvl)
			}, 0)

			return {
				avsAddress,
				apy: weightedApy,
				strategies
			}
		})

		return {
			aggregateApy: avsApys.reduce((sum, avs) => sum + avs.apy, 0) + nativeApy,
			nativeApy,
			tokenAmounts,
			strategyApys,
			avsApys
		}
	} catch {}
}
