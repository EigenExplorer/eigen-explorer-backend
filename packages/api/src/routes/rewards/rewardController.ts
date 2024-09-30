import type { Request, Response } from 'express'
import type { IMap } from '../../schema/generic'
import {
	type TokenPrices,
	fetchRewardTokenPrices,
	fetchStrategyTokenPrices
} from '../../utils/tokenPrices'
import Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import { getNetwork } from '../../viem/viemClient'
import { holesky } from 'viem/chains'
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

		const strategyTokenPrices = await fetchStrategyTokenPrices()
		const rewardTokenPrices = await fetchRewardTokenPrices()
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

		// Iterate over each rewards submission by the Avs
		for (const submission of rewardsSubmissions) {
			if (
				!currentSubmission ||
				currentSubmission.rewardsSubmissionHash !==
					submission.rewardsSubmissionHash
			) {
				if (currentSubmission) {
					currentSubmission.totalAmount = currentTotalAmount.toString()
					result.submissions.push(currentSubmission)
					result.totalSubmissions++
				}
				currentSubmission = {
					rewardsSubmissionHash: submission.rewardsSubmissionHash,
					startTimestamp: Number(submission.startTimestamp),
					duration: submission.duration,
					totalAmount: '0',
					rewards: [
						{
							tokenAddress: submission.token,
							strategies: []
						}
					]
				}
				currentTotalAmount = new Prisma.Prisma.Decimal(0)
				result.totalRewards += currentTotalAmountEth.toNumber()
				currentTotalAmountEth = new Prisma.Prisma.Decimal(0)
			}

			const amount = submission.amount || new Prisma.Prisma.Decimal(0)
			currentTotalAmount = currentTotalAmount.add(amount)

			const rewardTokenAddress = submission.token.toLowerCase()
			const tokenStrategyAddress = tokenToStrategyMap.get(rewardTokenAddress)

			// Normalize reward amount to its ETH price
			if (tokenStrategyAddress) {
				const tokenPrice = Object.values(strategyTokenPrices).find(
					(tp) => tp.strategyAddress.toLowerCase() === tokenStrategyAddress
				)
				const amountInEth = amount.mul(
					new Prisma.Prisma.Decimal(tokenPrice?.eth ?? 0)
				)
				currentTotalAmountEth = currentTotalAmountEth.add(amountInEth)
			} else {
				// Check if it is a reward token which isn't a strategy on EL
				for (const [, price] of Object.entries(rewardTokenPrices)) {
					if (
						price &&
						price.tokenAddress.toLowerCase() === rewardTokenAddress
					) {
						const amountInEth = amount.mul(
							new Prisma.Prisma.Decimal(price?.eth ?? 0)
						)
						currentTotalAmountEth = currentTotalAmountEth.add(amountInEth)
					} else {
						// Check for special tokens
						currentTotalAmountEth = isSpecialToken(rewardTokenAddress)
							? currentTotalAmountEth.add(amount)
							: new Prisma.Prisma.Decimal(0)

						// TODO: Add support for Eigen rewards
					}
				}
			}

			currentSubmission.rewards[0].strategies.push({
				strategyAddress: submission.strategyAddress,
				multiplier: submission.multiplier?.toString() || '0',
				amount: amount.toString()
			})
		}

		// Add final submission
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

		const rewardsData = await prisma.avsStrategyRewardSubmission.findMany({
			where: {
				avsAddress: address.toLowerCase()
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

		const rewardsData = await prisma.avsStrategyRewardSubmission.findMany({
			where: {
				avsAddress: address.toLowerCase()
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
 * Route to return strategy-wise, aggregate & avg APY for a given Avs
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
			where: { address: address.toLowerCase() },
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
				rewardSubmissions: true
			}
		})

		if (!avs) {
			throw new Error('AVS not found.')
		}

		const strategyTokenPrices = await fetchStrategyTokenPrices()
		const rewardTokenPrices = await fetchRewardTokenPrices()
		const eigenContracts = getEigenContracts()
		const tokenToStrategyMap = tokenToStrategyAddressMap(
			eigenContracts.Strategies
		)

		const strategiesWithSharesUnderlying =
			await getStrategiesWithShareUnderlying()

		// Get share amounts for each restakeable strategy
		const shares = withOperatorShares(avs.operators).filter(
			(s) =>
				avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !==
				-1
		)

		// Fetch the AVS tvl for each strategy
		const tvlStrategiesEth = sharesToTVL(
			shares,
			strategiesWithSharesUnderlying,
			strategyTokenPrices
		)

		// Iterate through each strategy and calculate all its rewards
		const strategiesApy = avs.restakeableStrategies.map((strategyAddress) => {
			const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
			if (strategyTvl === 0) return { strategyAddress, apy: 0 }

			let totalRewardsEth = new Prisma.Prisma.Decimal(0)
			let totalDuration = 0

			// Find all reward submissions attributable to the strategy
			const relevantSubmissions = avs.rewardSubmissions.filter(
				(submission) =>
					submission.strategyAddress.toLowerCase() ===
					strategyAddress.toLowerCase()
			)

			// Calculate each reward amount for the strategy
			for (const submission of relevantSubmissions) {
				let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
				const rewardTokenAddress = submission.token.toLowerCase()
				const tokenStrategyAddress = tokenToStrategyMap.get(rewardTokenAddress)

				// Normalize reward amount to its ETH price
				if (tokenStrategyAddress) {
					const tokenPrice = Object.values(strategyTokenPrices).find(
						(tp) => tp.strategyAddress.toLowerCase() === tokenStrategyAddress
					)
					rewardIncrementEth = submission.amount.mul(
						new Prisma.Prisma.Decimal(tokenPrice?.eth ?? 0)
					)
				} else {
					// Check if it is a reward token which isn't a strategy on EL
					for (const [, price] of Object.entries(rewardTokenPrices)) {
						if (
							price &&
							price.tokenAddress.toLowerCase() === rewardTokenAddress
						) {
							rewardIncrementEth = submission.amount.mul(
								new Prisma.Prisma.Decimal(price.eth ?? 0)
							)
						} else {
							// Check for special tokens
							rewardIncrementEth = isSpecialToken(rewardTokenAddress)
								? submission.amount
								: new Prisma.Prisma.Decimal(0)

							// TODO: Add support for Eigen rewards
						}
					}
				}

				// Multiply reward amount in ETH by the strategy weight
				rewardIncrementEth = rewardIncrementEth
					.mul(submission.multiplier)
					.div(new Prisma.Prisma.Decimal(10).pow(18))

				totalRewardsEth = totalRewardsEth.add(rewardIncrementEth)
				totalDuration += submission.duration
			}

			if (totalDuration === 0) {
				return { strategyAddress, apy: 0 }
			}

			// Annualize the reward basis its duration to find yearly APY
			const rewardRate =
				totalRewardsEth.div(new Prisma.Prisma.Decimal(10).pow(18)).toNumber() /
				strategyTvl
			const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
			const apy = annualizedRate * 100

			return { strategyAddress, apy }
		})

		// Calculate aggregate and average APYs across strategies
		const aggregateApy = strategiesApy.reduce(
			(sum, strategy) => sum + strategy.apy,
			0
		)
		const averageApy = aggregateApy / strategiesApy.length

		const result = {
			avsAddress: address,
			strategies: strategiesApy,
			aggregateApy,
			averageApy
		}

		res.send(result)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to return avs-wise, strategy-wise, aggregate & avg APY for a given Operator
 * Used by /operators/:address/apy
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
		const { address } = req.params

		const avsRewardsMap: Map<string, number> = new Map()
		const strategyRewardsMap: Map<string, number> = new Map()

		// Fetch Operator data
		const operator = await prisma.operator.findUnique({
			where: { address: address.toLowerCase() },
			include: {
				avs: {
					include: {
						avs: {
							include: {
								rewardSubmissions: true,
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
				shares: true
			}
		})

		if (!operator) {
			throw new Error('Operator not found.')
		}

		// Grab the all reward submissions that the Operator is eligible for basis opted strategies & AVSs
		const optedStrategyAddresses = new Set(
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
				operatorAddress: address,
				avs: [],
				strategies: [],
				aggregateApy: 0,
				averageAvsApy: 0,
				averageStrategiesApy: 0,
				operatorEarningsEth: 0
			}
		}

		let operatorEarningsEth = new Prisma.Prisma.Decimal(0)

		const strategyTokenPrices = await fetchStrategyTokenPrices()
		const rewardTokenPrices = await fetchRewardTokenPrices()
		const eigenContracts = getEigenContracts()
		const tokenToStrategyMap = tokenToStrategyAddressMap(
			eigenContracts.Strategies
		)

		const strategiesWithSharesUnderlying =
			await getStrategiesWithShareUnderlying()

		// Calc aggregate APY for each AVS basis the opted-in strategies
		for (const avs of avsWithEligibleRewardSubmissions) {
			let aggregateApy = 0

			// Get share amounts for each restakeable strategy
			const shares = withOperatorShares(avs.avs.operators).filter(
				(s) =>
					avs.avs.restakeableStrategies.indexOf(
						s.strategyAddress.toLowerCase()
					) !== -1
			)

			// Fetch the AVS tvl for each strategy
			const tvlStrategiesEth = sharesToTVL(
				shares,
				strategiesWithSharesUnderlying,
				strategyTokenPrices
			)

			// Iterate through each strategy and calculate all its rewards
			for (const strategyAddress of optedStrategyAddresses) {
				const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
				if (strategyTvl === 0) continue

				let totalRewardsEth = new Prisma.Prisma.Decimal(0)
				let totalDuration = 0

				// Find all reward submissions attributable to the strategy
				const relevantSubmissions = avs.eligibleRewards.filter(
					(submission) =>
						submission.strategyAddress.toLowerCase() ===
						strategyAddress.toLowerCase()
				)

				for (const submission of relevantSubmissions) {
					let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
					const rewardTokenAddress = submission.token.toLowerCase()
					const tokenStrategyAddress =
						tokenToStrategyMap.get(rewardTokenAddress)

					// Normalize reward amount to its ETH price
					if (tokenStrategyAddress) {
						const tokenPrice = Object.values(strategyTokenPrices).find(
							(tp) => tp.strategyAddress.toLowerCase() === tokenStrategyAddress
						)
						rewardIncrementEth = submission.amount.mul(
							new Prisma.Prisma.Decimal(tokenPrice?.eth ?? 0)
						)
					} else {
						// Check if it is a reward token which isn't a strategy on EL
						for (const [, price] of Object.entries(rewardTokenPrices)) {
							if (
								price &&
								price.tokenAddress.toLowerCase() === rewardTokenAddress
							) {
								rewardIncrementEth = submission.amount.mul(
									new Prisma.Prisma.Decimal(price.eth ?? 0)
								)
							} else {
								// Check for special tokens
								rewardIncrementEth = isSpecialToken(rewardTokenAddress)
									? submission.amount
									: new Prisma.Prisma.Decimal(0)

								// TODO: Add support for Eigen rewards
							}
						}
					}

					// Multiply reward amount in ETH by the strategy weight
					rewardIncrementEth = rewardIncrementEth
						.mul(submission.multiplier)
						.div(new Prisma.Prisma.Decimal(10).pow(18))

					// Operator takes 10% in commission
					const operatorFeesEth = rewardIncrementEth.mul(10).div(100)
					operatorEarningsEth = operatorEarningsEth.add(operatorFeesEth)

					totalRewardsEth = totalRewardsEth.add(rewardIncrementEth).sub(operatorFeesEth)
					totalDuration += submission.duration
				}

				if (totalDuration === 0) continue

				// Annualize the reward basis its duration to find yearly APY
				const rewardRate =
					totalRewardsEth
						.div(new Prisma.Prisma.Decimal(10).pow(18))
						.toNumber() / strategyTvl
				const annualizedRate =
					rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
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
			operatorAddress: address,
			avs: Array.from(avsRewardsMap, ([avsAddress, apy]) => ({
				avsAddress,
				apy
			})),
			strategies: Array.from(strategyRewardsMap, ([strategyAddress, apy]) => ({
				strategyAddress,
				apy
			})),
			aggregateApy: 0,
			averageAvsApy: 0,
			averageStrategiesApy: 0,
			operatorEarningsEth: new Prisma.Prisma.Decimal(0)
		}

		// Calculate aggregate and averages across Avs and strategies
		response.aggregateApy = response.avs.reduce((sum, avs) => sum + avs.apy, 0)
		response.averageAvsApy =
			response.avs.length > 0 ? response.aggregateApy / response.avs.length : 0
		response.averageStrategiesApy =
			response.strategies.length > 0
				? response.strategies.reduce((sum, strategy) => sum + strategy.apy, 0) /
				  response.strategies.length
				: 0
		response.operatorEarningsEth = operatorEarningsEth

		res.send(response)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Helper functions ---

/**
 * Return the Tvl in Eth of a given set of shares across strategies
 *
 * @param shares
 * @param strategiesWithSharesUnderlying
 * @param strategyTokenPrices
 * @returns
 */
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

	const beaconStrategy = shares.find(
		(s) => s.strategyAddress.toLowerCase() === beaconAddress
	)

	const tvlBeaconChain = beaconStrategy
		? Number(beaconStrategy.shares) / 1e18
		: 0

	const strategies = getEigenContracts().Strategies
	const addressToKey = Object.entries(strategies).reduce(
		(acc, [key, value]) => {
			acc[value.strategyContract.toLowerCase()] = key
			return acc
		},
		{} as Record<string, string>
	)

	const tvlStrategiesEth: { [strategyAddress: string]: number } = {
		[beaconAddress]: tvlBeaconChain
	}

	for (const share of shares) {
		const strategyAddress = share.strategyAddress.toLowerCase()
		const isBeaconStrategy = strategyAddress.toLowerCase() === beaconAddress

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

			const strategyKey = addressToKey[strategyAddress]
			if (strategyKey) {
				tvlStrategiesEth[strategyAddress] =
					(tvlStrategiesEth[strategyAddress] || 0) + strategyTvl
			}
		}
	}

	return tvlStrategiesEth
}

/**
 * Return a map of strategy addresses <> token addresses
 *
 * @param strategies
 * @returns
 */
export function tokenToStrategyAddressMap(
	strategies: EigenStrategiesContractAddress
): Map<string, string> {
	const map = new Map<string, string>()
	for (const [key, value] of Object.entries(strategies)) {
		if (key !== 'Eigen' && value?.tokenContract && value?.strategyContract) {
			map.set(
				value.tokenContract.toLowerCase(),
				value.strategyContract.toLowerCase()
			)
		}
	}
	return map
}

/**
 * Returns whether a given token address belongs to a list of special tokens
 *
 * @param tokenAddress
 * @returns
 */
export function isSpecialToken(tokenAddress: string): boolean {
	const specialTokens =
		getNetwork() === holesky
			? [
					'0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455', // WETH
					'0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'
			  ]
			: [
					'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
					'0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'
			  ]

	return specialTokens.includes(tokenAddress.toLowerCase())
}

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
