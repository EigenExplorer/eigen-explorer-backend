import prisma from '@prisma/client'
import { type IMap, bulkUpdateDbTransactions } from '../utils/seeder'
import {
	type EigenStrategiesContractAddress,
	getEigenContracts
} from '../data/address'
import {
	type TokenPrices,
	fetchRewardTokenPrices,
	fetchStrategyTokenPrices
} from '../utils/tokenPrices'
import { createHash } from 'crypto'
import { getPrismaClient } from '../utils/prismaClient'
import { getStrategiesWithShareUnderlying } from '../metrics/seedMetricsTvl'
import { sharesToTVL } from './avsMetrics'
import { getNetwork } from '../utils/viemClient'
import { holesky } from 'viem/chains'

export async function monitorOperatorMetrics() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		totalStakers: number
		totalAvs: number
		apy: prisma.Prisma.Decimal
		tvlEth: number
		sharesHash: string
	}[] = []

	let skip = 0
	const take = 1000

	const strategyTokenPrices = await fetchStrategyTokenPrices()
	const rewardTokenPrices = await fetchRewardTokenPrices()
	const eigenContracts = getEigenContracts()
	const tokenToStrategyMap = tokenToStrategyAddressMap(
		eigenContracts.Strategies
	)

	const strategiesWithSharesUnderlying =
		await getStrategiesWithShareUnderlying()

	while (true) {
		try {
			// Fetch totalStakers, totalAvs and avs data for all operators in this iteration
			const operatorMetrics = await prismaClient.operator.findMany({
				include: {
					shares: {
						select: { strategyAddress: true, shares: true }
					},
					avs: {
						select: {
							avsAddress: true,
							isActive: true,
							avs: {
								select: {
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
							}
						}
					},
					_count: {
						select: {
							stakers: true,
							avs: { where: { isActive: true } }
						}
					}
				},
				orderBy: {
					createdAtBlock: 'asc'
				},
				skip,
				take
			})

			if (operatorMetrics.length === 0) {
				break
			}

			// Setup all db transactions for this iteration
			for (const operator of operatorMetrics) {
				const sharesHash = createHash('md5')
					.update(JSON.stringify(operator.shares))
					.digest('hex')
				const totalStakers = operator._count.stakers
				const totalAvs = operator._count.avs
				let apy = new prisma.Prisma.Decimal(0)

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

				if (avsWithEligibleRewardSubmissions.length > 0) {
					let operatorEarningsEth = new prisma.Prisma.Decimal(0)

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
						const tvlStrategiesEth = sharesToTVLEth(
							shares,
							strategiesWithSharesUnderlying,
							strategyTokenPrices
						)

						// Iterate through each strategy and calculate all its rewards
						for (const strategyAddress of optedStrategyAddresses) {
							const strategyTvl =
								tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
							if (strategyTvl === 0) continue

							let totalRewardsEth = new prisma.Prisma.Decimal(0)
							let totalDuration = 0

							// Find all reward submissions attributable to the strategy
							const relevantSubmissions = avs.eligibleRewards.filter(
								(submission) =>
									submission.strategyAddress.toLowerCase() ===
									strategyAddress.toLowerCase()
							)

							for (const submission of relevantSubmissions) {
								let rewardIncrementEth = new prisma.Prisma.Decimal(0)
								const rewardTokenAddress = submission.token.toLowerCase()
								const tokenStrategyAddress =
									tokenToStrategyMap.get(rewardTokenAddress)

								// Normalize reward amount to its ETH price
								if (tokenStrategyAddress) {
									const tokenPrice = Object.values(strategyTokenPrices).find(
										(tp) =>
											tp.strategyAddress.toLowerCase() === tokenStrategyAddress
									)
									rewardIncrementEth = submission.amount.mul(
										new prisma.Prisma.Decimal(tokenPrice?.eth ?? 0)
									)
								} else {
									// Check if it is a reward token which isn't a strategy on EL
									for (const [, price] of Object.entries(rewardTokenPrices)) {
										if (
											price &&
											price.tokenAddress.toLowerCase() === rewardTokenAddress
										) {
											rewardIncrementEth = submission.amount.mul(
												new prisma.Prisma.Decimal(price.eth ?? 0)
											)
										} else {
											// Check for special tokens
											rewardIncrementEth = isSpecialToken(rewardTokenAddress)
												? submission.amount
												: new prisma.Prisma.Decimal(0)
										}
									}
								}

								// Multiply reward amount in ETH by the strategy weight
								rewardIncrementEth = rewardIncrementEth
									.mul(submission.multiplier)
									.div(new prisma.Prisma.Decimal(10).pow(18))

								// Operator takes 10% in commission
								const operatorFeesEth = rewardIncrementEth.mul(10).div(100)
								operatorEarningsEth = operatorEarningsEth.add(operatorFeesEth)

								totalRewardsEth = totalRewardsEth
									.add(rewardIncrementEth)
									.sub(operatorFeesEth)
								totalDuration += submission.duration
							}

							if (totalDuration === 0) continue

							// Annualize the reward basis its duration to find yearly APY
							const rewardRate =
								totalRewardsEth
									.div(new prisma.Prisma.Decimal(10).pow(18))
									.toNumber() / strategyTvl
							const annualizedRate =
								rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
							const apy = annualizedRate * 100
							aggregateApy += apy

							// Add strategy's APY to common strategy rewards store (across all Avs)
							const currentStrategyApy =
								strategyRewardsMap.get(strategyAddress) || 0
							strategyRewardsMap.set(strategyAddress, currentStrategyApy + apy)
						}
						// Add aggregate APY to Avs rewards store
						avsRewardsMap.set(avs.avs.address, aggregateApy)
					}

					const avs = Array.from(avsRewardsMap, ([avsAddress, apy]) => ({
						avsAddress,
						apy
					}))

					// Calculate aggregates across Avs and strategies
					apy = new prisma.Prisma.Decimal(avs.reduce((sum, avs) => sum + avs.apy, 0))
				}

				if (
					operator.totalAvs !== totalAvs ||
					operator.totalStakers !== totalStakers ||
					operator.apy !== apy ||
					operator.sharesHash !== sharesHash
				) {
					const tvlObject = sharesToTVL(
						operator.shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
					)

					data.push({
						address: operator.address,
						totalStakers: operator._count.stakers,
						totalAvs: operator._count.avs,
						apy,
						tvlEth: tvlObject.tvl,
						sharesHash
					})
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Operator" AS o
					SET
						"totalStakers" = o2."totalStakers",
						"totalAvs" = o2."totalAvs",
						"tvlEth" = o2."tvlEth",
						"apy" = o2."apy",
						"sharesHash" = o2."sharesHash"
					FROM
						(
							VALUES
								${data
									.map(
										(d) =>
											`('${d.address}', ${d.totalStakers}, ${d.totalAvs}, ${d.apy}, ${d.tvlEth}, '${d.sharesHash}')`
									)
									.join(', ')}
						) AS o2 (address, "totalStakers", "totalAvs", "apy", "tvlEth", "sharesHash")
					WHERE
						o2.address = o.address;
				`

				dbTransactions.push(
					prismaClient.$executeRaw`${prisma.Prisma.raw(query)}`
				)
			}
		} catch (error) {}
	}

	// Write to db
	if (dbTransactions.length > 0) {
		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Monitor] Updated Operator metrics: ${dbTransactions.length}`
		)
	}
}

// --- Helper methods ---

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
 * Return the Tvl in Eth of a given set of shares across strategies
 *
 * @param shares
 * @param strategiesWithSharesUnderlying
 * @param strategyTokenPrices
 * @returns
 */
export function sharesToTVLEth(
	shares: {
		strategyAddress: string
		shares: string
	}[],
	strategiesWithSharesUnderlying: Map<string, bigint>,
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

		const sharesUnderlying = strategiesWithSharesUnderlying.get(strategyAddress)

		const strategyTokenPrice = isBeaconStrategy
			? { eth: 1 }
			: Object.values(strategyTokenPrices).find(
					(stp) => stp.strategyAddress.toLowerCase() === strategyAddress
			  )

		if (sharesUnderlying !== undefined && strategyTokenPrice) {
			const strategyShares =
				new prisma.Prisma.Decimal(share.shares)
					.mul(new prisma.Prisma.Decimal(sharesUnderlying.toString()))
					.div(new prisma.Prisma.Decimal(10).pow(18))
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
