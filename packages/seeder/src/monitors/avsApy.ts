import prisma from '@prisma/client'
import { type IMap, bulkUpdateDbTransactions } from '../utils/seeder'
import { type EigenStrategiesContractAddress, getEigenContracts } from '../data/address'
import {
	type TokenPrices,
	fetchRewardTokenPrices,
	fetchStrategyTokenPrices
} from '../utils/tokenPrices'
import { getPrismaClient } from '../utils/prismaClient'
import { getStrategiesWithShareUnderlying } from '../metrics/seedMetricsTvl'
import { getNetwork } from '../utils/viemClient'
import { holesky } from 'viem/chains'

export async function monitorAvsApy() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		apy: prisma.Prisma.Decimal
	}[] = []

	let skip = 0
	const take = 32

	const strategyTokenPrices = await fetchStrategyTokenPrices()
	const rewardTokenPrices = await fetchRewardTokenPrices()
	const eigenContracts = getEigenContracts()
	const tokenToStrategyMap = tokenToStrategyAddressMap(eigenContracts.Strategies)

	const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

	while (true) {
		try {
			// Fetch totalStakers, totalOperators & rewards data for all avs in this iteration
			const avsMetrics = await prismaClient.avs.findMany({
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
				},
				skip,
				take
			})

			if (avsMetrics.length === 0) {
				break
			}

			// Setup all db transactions for this iteration
			for (const avs of avsMetrics) {
				const shares = withOperatorShares(avs.operators).filter(
					(s) => avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
				)

				let apy = new prisma.Prisma.Decimal(0)

				if (avs.rewardSubmissions.length > 0) {
					// Fetch the AVS tvl for each strategy
					const tvlStrategiesEth = sharesToTVLEth(
						shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
					)

					// Iterate through each strategy and calculate all its rewards
					const strategiesApy = avs.restakeableStrategies.map((strategyAddress) => {
						const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
						if (strategyTvl === 0) return { strategyAddress, apy: 0 }

						let totalRewardsEth = new prisma.Prisma.Decimal(0)
						let totalDuration = 0

						// Find all reward submissions attributable to the strategy
						const relevantSubmissions = avs.rewardSubmissions.filter(
							(submission) =>
								submission.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
						)

						// Calculate each reward amount for the strategy
						for (const submission of relevantSubmissions) {
							let rewardIncrementEth = new prisma.Prisma.Decimal(0)
							const rewardTokenAddress = submission.token.toLowerCase()
							const tokenStrategyAddress = tokenToStrategyMap.get(rewardTokenAddress)

							// Normalize reward amount to its ETH price
							if (tokenStrategyAddress) {
								const tokenPrice = Object.values(strategyTokenPrices).find(
									(tp) => tp.strategyAddress.toLowerCase() === tokenStrategyAddress
								)
								rewardIncrementEth = submission.amount.mul(
									new prisma.Prisma.Decimal(tokenPrice?.eth ?? 0)
								)
							} else {
								// Check if it is a reward token which isn't a strategy on EL
								for (const [, price] of Object.entries(rewardTokenPrices)) {
									if (price && price.tokenAddress.toLowerCase() === rewardTokenAddress) {
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

							totalRewardsEth = totalRewardsEth.add(rewardIncrementEth)
							totalDuration += submission.duration
						}

						if (totalDuration === 0) {
							return { strategyAddress, apy: 0 }
						}

						// Annualize the reward basis its duration to find yearly APY
						const rewardRate =
							totalRewardsEth.div(new prisma.Prisma.Decimal(10).pow(18)).toNumber() / strategyTvl
						const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
						const apy = annualizedRate * 100

						return { strategyAddress, apy }
					})

					// Calculate aggregate APY across strategies
					apy = new prisma.Prisma.Decimal(
						strategiesApy.reduce((sum, strategy) => sum + strategy.apy, 0)
					)
				}

				if (avs.apy !== apy) {
					data.push({
						address: avs.address,
						apy
					})
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Avs" AS a
					SET
						"apy" = a2."apy"
					FROM
						(
							VALUES
								${data.map((d) => `('${d.address}', ${d.apy})`).join(', ')}
						) AS a2 (address, "apy")
					WHERE
						a2.address = a.address;
				`
				dbTransactions.push(prismaClient.$executeRaw`${prisma.Prisma.raw(query)}`)
			}
		} catch (error) {}
	}

	// Write to db
	if (dbTransactions.length > 0) {
		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Monitor] Updated AVS APYs: ${dbTransactions.length}`
		)
	}
}

// --- Helper methods ---

function withOperatorShares(avsOperators) {
	const sharesMap: IMap<string, string> = new Map()

	avsOperators.map((avsOperator) => {
		const shares = avsOperator.operator.shares.filter(
			(s) => avsOperator.restakedStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
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

export function sharesToTVL(
	shares: {
		strategyAddress: string
		shares: string
	}[],
	strategiesWithSharesUnderlying: Map<string, bigint>,
	strategyTokenPrices: TokenPrices
) {
	const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'

	const beaconStrategy = shares.find((s) => s.strategyAddress.toLowerCase() === beaconAddress)
	const restakingStrategies = shares.filter(
		(s) => s.strategyAddress.toLowerCase() !== beaconAddress
	)

	const tvlBeaconChain = beaconStrategy ? Number(beaconStrategy.shares) / 1e18 : 0

	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategies = Object.values(getEigenContracts().Strategies)

	let tvlRestaking = 0
	const tvlStrategies: Map<keyof EigenStrategiesContractAddress, number> = new Map(
		strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
	)
	const tvlStrategiesEth: Map<keyof EigenStrategiesContractAddress, number> = new Map(
		strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
	)

	restakingStrategies.map((s) => {
		const foundStrategyIndex = strategies.findIndex(
			(si) => si.strategyContract.toLowerCase() === s.strategyAddress.toLowerCase()
		)

		const strategyTokenPrice = Object.values(strategyTokenPrices).find(
			(stp) => stp.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
		)
		const sharesUnderlying = strategiesWithSharesUnderlying.get(s.strategyAddress.toLowerCase())

		if (foundStrategyIndex !== -1 && sharesUnderlying) {
			const strategyShares =
				Number((BigInt(s.shares) * BigInt(sharesUnderlying)) / BigInt(1e18)) / 1e18

			tvlStrategies.set(
				strategyKeys[foundStrategyIndex] as keyof EigenStrategiesContractAddress,
				strategyShares
			)

			if (strategyTokenPrice) {
				const strategyTvl = strategyShares * strategyTokenPrice.eth

				tvlStrategiesEth.set(
					strategyKeys[foundStrategyIndex] as keyof EigenStrategiesContractAddress,
					strategyTvl
				)

				tvlRestaking = tvlRestaking + strategyTvl
			}
		}
	})

	return {
		tvl: tvlBeaconChain + tvlRestaking,
		tvlBeaconChain,
		tvlWETH: tvlStrategies.has('WETH') ? tvlStrategies.get('WETH') : 0,
		tvlRestaking,
		tvlStrategies: Object.fromEntries(tvlStrategies.entries()),
		tvlStrategiesEth: Object.fromEntries(tvlStrategiesEth.entries())
	}
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

	const beaconStrategy = shares.find((s) => s.strategyAddress.toLowerCase() === beaconAddress)

	const tvlBeaconChain = beaconStrategy ? Number(beaconStrategy.shares) / 1e18 : 0

	const strategies = getEigenContracts().Strategies
	const addressToKey = Object.entries(strategies).reduce((acc, [key, value]) => {
		acc[value.strategyContract.toLowerCase()] = key
		return acc
	}, {} as Record<string, string>)

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
				tvlStrategiesEth[strategyAddress] = (tvlStrategiesEth[strategyAddress] || 0) + strategyTvl
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
			map.set(value.tokenContract.toLowerCase(), value.strategyContract.toLowerCase())
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
