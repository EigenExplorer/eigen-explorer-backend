import type { Request, Response } from 'express'
import {
	type TokenPrices,
	fetchStrategyTokenPrices
} from '../../utils/tokenPrices'
import Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { getStrategiesWithShareUnderlying } from '../strategies/strategiesController'
import { getEigenContracts } from '../../data/address'

type Submission = {
	rewardsSubmissionHash: string
	startTimestamp: number
	duration: number
	totalAmount: string
	rewards: {
		tokenAddress: string
		strategies: {
			strategyAddress: string
			multiplier: string
			amount: string
		}[]
	}[]
}

type TokenInfo = {
	tokenAddress: string
	strategies: string[]
}

type AvsRewardTokens = {
	avsAddress: string
	tokens: TokenInfo[]
	total: number
}

type StrategyInfo = {
	strategyAddress: string
	tokens: string[]
}

type AvsRewardStrategies = {
	avsAddress: string
	strategies: StrategyInfo[]
	total: number
}

type AvsApyResult = {
	avsAddress: string
	apy: number
}

/**
 * Route to get a list of all rewards for a given Avs
 * Used by /avs/:address
 *
 * @param req
 * @param res
 */
export async function getAvsRewards(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params

		const rewardsData = await prisma.avsRewardSubmissions.findMany({
			where: {
				avsAddress: address
			},
			orderBy: {
				rewardsSubmissionHash: 'asc'
			}
		})

		if (!rewardsData || rewardsData.length === 0) {
			throw new Error('AVS not found.')
		}

		const result: {
			avsAddress: string
			submissions: Submission[]
			total: number
		} = {
			avsAddress: address,
			submissions: [],
			total: 0
		}

		let currentSubmission: Submission | null = null
		let currentTotalAmount = 0n

		for (const data of rewardsData) {
			if (
				!currentSubmission ||
				currentSubmission.rewardsSubmissionHash !== data.rewardsSubmissionHash
			) {
				if (currentSubmission) {
					currentSubmission.totalAmount = roundUpToWhole(currentTotalAmount)
					result.submissions.push(currentSubmission)
				}
				currentSubmission = {
					rewardsSubmissionHash: data.rewardsSubmissionHash,
					startTimestamp: Number(data.startTimestamp),
					duration: data.duration,
					totalAmount: '0',
					rewards: [
						{
							tokenAddress: data.token,
							strategies: []
						}
					]
				}
				currentTotalAmount = 0n
				result.total++
			}

			const amount = BigInt(data.amount?.toString() ?? '0')
			currentTotalAmount += amount

			currentSubmission.rewards[0].strategies.push({
				strategyAddress: data.strategyAddress,
				multiplier: data.multiplier?.toString() || '0',
				amount: amount.toString()
			})
		}

		if (currentSubmission) {
			currentSubmission.totalAmount = roundUpToWhole(currentTotalAmount)
			result.submissions.push(currentSubmission)
		}

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route get all tokens (and their associated strategies) that an Avs gives rewards in
 * Used by /avs/:address/tokens
 *
 * @param req
 * @param res
 */
export async function getAvsRewardTokens(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}
	try {
		const { address } = req.params

		const rewardsData = await prisma.avsRewardSubmissions.findMany({
			where: {
				avsAddress: address
			},
			select: {
				token: true,
				strategyAddress: true
			},
			distinct: ['token', 'strategyAddress']
		})

		if (!rewardsData || rewardsData.length === 0) {
			throw new Error('AVS not found.')
		}

		const tokenMap = new Map<string, Set<string>>()

		for (const item of rewardsData) {
			if (!tokenMap.has(item.token)) {
				tokenMap.set(item.token, new Set())
			}
			tokenMap.get(item.token)?.add(item.strategyAddress)
		}

		const result: AvsRewardTokens = {
			avsAddress: address,
			tokens: Array.from(tokenMap.entries()).map(
				([tokenAddress, strategies]) => ({
					tokenAddress,
					strategies: Array.from(strategies)
				})
			),
			total: tokenMap.size
		}

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route get all strategies (and their associated reward tokens) that an Avs rewards
 * Used by /avs/:address/strategies
 *
 * @param req
 * @param res
 */
export async function getAvsRewardStrategies(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params

		const rewardsData = await prisma.avsRewardSubmissions.findMany({
			where: {
				avsAddress: address
			},
			select: {
				strategyAddress: true,
				token: true
			},
			distinct: ['strategyAddress', 'token']
		})

		if (!rewardsData || rewardsData.length === 0) {
			throw new Error('AVS not found.')
		}

		const strategyMap = new Map<string, Set<string>>()

		for (const item of rewardsData) {
			if (!strategyMap.has(item.strategyAddress)) {
				strategyMap.set(item.strategyAddress, new Set())
			}
			strategyMap.get(item.strategyAddress)?.add(item.token)
		}

		const result: AvsRewardStrategies = {
			avsAddress: address,
			strategies: Array.from(strategyMap.entries()).map(
				([strategyAddress, tokens]) => ({
					strategyAddress,
					tokens: Array.from(tokens)
				})
			),
			total: strategyMap.size
		}

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to return strategy-wise & avg APY for a given Avs
 * Used by /avs/:address/apy
 *
 * @param req
 * @param res
 */
export async function getAvsRewardsApy(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params

		// Fetch AVS data
		const avs = await prisma.avs.findUnique({
			where: { address },
			include: {
				operators: {
					where: { isActive: true },
					include: {
						operator: {
							include: {
								shares: true
							}
						}
					}
				},
				avsRewardSubmissions: true
			}
		})

		if (!avs) {
			throw new Error('AVS not found.')
		}

		const strategyTokenPrices = await fetchStrategyTokenPrices()

		const strategiesWithSharesUnderlying =
			await getStrategiesWithShareUnderlying()

		const shares = avs.operators
			.flatMap((op) => op.operator.shares)
			.filter(
				(s) =>
					avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !==
					-1
			)

		const tvlStrategiesEth = sharesToTVL(
			shares,
			strategiesWithSharesUnderlying,
			strategyTokenPrices
		)

		const strategiesApy = avs.restakeableStrategies.map((strategyAddress) => {
			const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
			if (strategyTvl === 0) return { strategyAddress, apy: 0 }

			let totalRewards = BigInt(0)
			let totalDuration = 0

			const relevantSubmissions = avs.avsRewardSubmissions.filter(
				(submission) =>
					submission.strategyAddress.toLowerCase() ===
					strategyAddress.toLowerCase()
			)

			for (const submission of relevantSubmissions) {
				const rewardIncrement =
					(BigInt(submission.amount) * BigInt(submission.multiplier)) /
					BigInt(1e18)
				totalRewards += rewardIncrement
				totalDuration += submission.duration
			}

			if (totalDuration === 0) {
				return { strategyAddress, apy: 0 }
			}

			const totalRewardsEth = Number(totalRewards) / 1e18
			const rewardRate = totalRewardsEth / strategyTvl
			const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
			const apy = annualizedRate * 100

			return { strategyAddress, apy }
		})

		const averageApy =
			strategiesApy.reduce((sum, strategy) => sum + strategy.apy, 0) /
			strategiesApy.length

		const result = {
			avsAddress: address,
			strategies: strategiesApy,
			average: averageApy
		}

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getOperatorRewardsApy(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address: operatorAddress } = req.params

		// Fetch operator data with related AVS and shares
		const operator = await prisma.operator.findUnique({
			where: { address: operatorAddress },
			include: {
				avs: {
					include: {
						avs: {
							include: {
								avsRewardSubmissions: true
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

		const strategyTokenPrices = await fetchStrategyTokenPrices()
		const strategiesWithSharesUnderlying =
			await getStrategiesWithShareUnderlying()

		// Calculate operator's TVL per strategy
		const operatorTvl = sharesToTVL(
			operator.shares,
			strategiesWithSharesUnderlying,
			strategyTokenPrices
		)

		const strategies = getEigenContracts().Strategies
		const addressToName = Object.entries(strategies).reduce(
			(acc, [key, value]) => {
				acc[value.strategyContract.toLowerCase()] = key
				return acc
			},
			{} as Record<string, string>
		)

		const avsApyMap: { [avsAddress: string]: number } = {}
		const strategyApyMap: {
			[strategyName: string]: {
				totalRewards: number
				totalTvl: number
				duration: number
			}
		} = {}

		// Calculate APY for each AVS and strategy
		for (const avsOperator of operator.avs) {
			const avs = avsOperator.avs
			let totalRewards = BigInt(0)
			let totalDuration = 0

			for (const submission of avs.avsRewardSubmissions) {
				if (operatorTvl[submission.strategyAddress.toLowerCase()]) {
					const rewardAmount =
						(BigInt(submission.amount) * BigInt(submission.multiplier)) /
						BigInt(1e18)
					totalRewards += rewardAmount
					totalDuration += submission.duration

					const strategyName =
						addressToName[submission.strategyAddress.toLowerCase()] ||
						submission.strategyAddress
					if (!strategyApyMap[strategyName]) {
						strategyApyMap[strategyName] = {
							totalRewards: 0,
							totalTvl: 0,
							duration: 0
						}
					}
					strategyApyMap[strategyName].totalRewards +=
						Number(rewardAmount) / 1e18
					strategyApyMap[strategyName].totalTvl +=
						operatorTvl[submission.strategyAddress.toLowerCase()] || 0
					strategyApyMap[strategyName].duration += submission.duration
				}
			}

			if (totalDuration > 0) {
				const totalRewardsEth = Number(totalRewards) / 1e18
				const operatorAvsTvl = Object.values(operatorTvl).reduce(
					(sum, tvl) => sum + tvl,
					0
				)
				const rewardRate = totalRewardsEth / operatorAvsTvl
				const annualizedRate =
					rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
				avsApyMap[avs.address] = annualizedRate * 100
			}
		}

		// Calculate APY for each strategy
		const strategyApyList = Object.entries(strategyApyMap).map(
			([strategyName, data]) => {
				const { totalRewards, totalTvl, duration } = data
				if (duration > 0 && totalTvl > 0) {
					const rewardRate = totalRewards / totalTvl
					const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / duration)
					return { strategyName, apy: annualizedRate * 100 }
				}
				return { strategyName, apy: 0 }
			}
		)

		const avsApyList = Object.entries(avsApyMap).map(([avsAddress, apy]) => ({
			avsAddress,
			apy
		}))

		const averageApy =
			avsApyList.reduce((sum, avs) => sum + avs.apy, 0) / avsApyList.length

		const result = {
			operatorAddress,
			avs: avsApyList,
			strategies: strategyApyList,
			average: averageApy
		}

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Helper functions ---

function roundUpToWhole(amount: bigint): string {
	const ten18 = BigInt(10 ** 18)
	const rounded = ((amount + ten18 - BigInt(1)) / ten18) * ten18
	return rounded.toString().padStart(19, '0')
}

export function sharesToTVL(
	shares: {
		strategyAddress: string
		shares: string
	}[],
	strategiesWithSharesUnderlying: {
		strategyAddress: string
		sharesToUnderlying: number
	}[],
	strategyTokenPrices: TokenPrices
): { [strategyAddress: string]: number } {
	const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'

	const strategies = getEigenContracts().Strategies
	const addressToKey = Object.entries(strategies).reduce(
		(acc, [key, value]) => {
			acc[value.strategyContract.toLowerCase()] = key
			return acc
		},
		{} as Record<string, string>
	)

	const tvlStrategiesEth: { [strategyAddress: string]: number } = {}

	for (const share of shares) {
		const strategyAddress = share.strategyAddress.toLowerCase()
		const isBeaconStrategy = strategyAddress === beaconAddress

		const sharesUnderlying = strategiesWithSharesUnderlying.find(
			(su) => su.strategyAddress.toLowerCase() === strategyAddress
		)

		const strategyTokenPrice = isBeaconStrategy
			? { eth: 1 }
			: Object.values(strategyTokenPrices).find(
					(stp) => stp.strategyAddress.toLowerCase() === strategyAddress
			  )

		if (sharesUnderlying && strategyTokenPrice) {
			const strategyShares =
				Number(
					(BigInt(share.shares) * BigInt(sharesUnderlying.sharesToUnderlying)) /
						BigInt(1e18)
				) / 1e18

			const strategyTvl = strategyShares * strategyTokenPrice.eth

			if (isBeaconStrategy) {
				tvlStrategiesEth[beaconAddress] = strategyTvl
			} else {
				const strategyKey = addressToKey[strategyAddress]
				if (strategyKey) {
					tvlStrategiesEth[strategyAddress] =
						(tvlStrategiesEth[strategyAddress] || 0) + strategyTvl
				}
			}
		}
	}

	return tvlStrategiesEth
}
