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
import {
	type EigenStrategiesContractAddress,
	getEigenContracts
} from '../../data/address'

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

		const strategyTokenPrices = await fetchStrategyTokenPrices()
		const eigenContracts = getEigenContracts()
		const tokenToStrategyMap = tokenToStrategyAddressMap(
			eigenContracts.Strategies
		)

		const result: {
			avsAddress: string
			submissions: Submission[]
			totalRewards: number
			totalSubmissions: number
		} = {
			avsAddress: address,
			submissions: [],
			totalRewards: 0,
			totalSubmissions: 0
		}

		let currentSubmission: Submission | null = null
		let currentTotalAmount = new Prisma.Prisma.Decimal(0)
		let currentTotalAmountEth = new Prisma.Prisma.Decimal(0)

		for (const data of rewardsData) {
			if (
				!currentSubmission ||
				currentSubmission.rewardsSubmissionHash !== data.rewardsSubmissionHash
			) {
				if (currentSubmission) {
					currentSubmission.totalAmount = currentTotalAmount.toString()
					result.submissions.push(currentSubmission)
					result.totalSubmissions++
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
				currentTotalAmount = new Prisma.Prisma.Decimal(0)
				result.totalRewards += currentTotalAmountEth.toNumber()
				currentTotalAmountEth = new Prisma.Prisma.Decimal(0)
			}

			const amount = data.amount || new Prisma.Prisma.Decimal(0)
			currentTotalAmount = currentTotalAmount.add(amount)

			const tokenStrategyAddress = tokenToStrategyMap.get(
				data.token.toLowerCase()
			)

			// Calculate ETH value
			if (tokenStrategyAddress) {
				const tokenPrice = Object.values(strategyTokenPrices).find(
					(tp) => tp.strategyAddress.toLowerCase() === tokenStrategyAddress
				)
				const amountInEth = amount.mul(
					new Prisma.Prisma.Decimal(tokenPrice?.eth ?? 1)
				)
				currentTotalAmountEth = currentTotalAmountEth.add(amountInEth)
			} else {
				currentTotalAmountEth = currentTotalAmountEth.add(amount)
			}

			currentSubmission.rewards[0].strategies.push({
				strategyAddress: data.strategyAddress,
				multiplier: data.multiplier?.toString() || '0',
				amount: amount.toString()
			})
		}

		if (currentSubmission) {
			currentSubmission.totalAmount = currentTotalAmount.toString()
			result.submissions.push(currentSubmission)
			result.totalSubmissions++
			result.totalRewards += currentTotalAmountEth.toNumber()
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
		const eigenContracts = getEigenContracts()
		const tokenToStrategyMap = tokenToStrategyAddressMap(
			eigenContracts.Strategies
		)

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

			let totalRewardsEth = new Prisma.Prisma.Decimal(0)
			let totalDuration = 0

			const relevantSubmissions = avs.avsRewardSubmissions.filter(
				(submission) =>
					submission.strategyAddress.toLowerCase() ===
					strategyAddress.toLowerCase()
			)

			for (const submission of relevantSubmissions) {
				const tokenStrategyAddress = tokenToStrategyMap.get(
					submission.token.toLowerCase()
				)

				let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
				if (tokenStrategyAddress) {
					const tokenPrice = Object.values(strategyTokenPrices).find(
						(tp) => tp.strategyAddress.toLowerCase() === tokenStrategyAddress
					)
					rewardIncrementEth = submission.amount.mul(
						new Prisma.Prisma.Decimal(tokenPrice?.eth ?? 1)
					)
				} else {
					rewardIncrementEth = submission.amount
				}

				rewardIncrementEth = rewardIncrementEth
					.mul(submission.multiplier)
					.div(new Prisma.Prisma.Decimal(10).pow(18))

				totalRewardsEth = totalRewardsEth.add(rewardIncrementEth)
				totalDuration += submission.duration
			}

			if (totalDuration === 0) {
				return { strategyAddress, apy: 0 }
			}

			const rewardRate =
				totalRewardsEth.div(new Prisma.Prisma.Decimal(10).pow(18)).toNumber() /
				strategyTvl
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

/**
 * Route to return avs-wise, strategy-wise & avg APY for a given Operator
 * Used by /avs/:address/apy
 *
 * @param req
 * @param res
 */
export async function getOperatorRewardsApy(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address: operatorAddress } = req.params
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Helper functions ---

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
				new Prisma.Prisma.Decimal(share.shares)
					.mul(
						new Prisma.Prisma.Decimal(
							sharesUnderlying.sharesToUnderlying.toString()
						)
					)
					.div(new Prisma.Prisma.Decimal(10).pow(18))
					.toNumber() / 1e18

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

export function tokenToStrategyAddressMap(
	strategies: EigenStrategiesContractAddress
): Map<string, string> {
	// TODO: Filter out EIGEN
	const map = new Map<string, string>()
	for (const [, value] of Object.entries(strategies)) {
		if (value?.tokenContract && value.strategyContract) {
			map.set(
				value.tokenContract.toLowerCase(),
				value.strategyContract.toLowerCase()
			)
		}
	}
	return map
}
