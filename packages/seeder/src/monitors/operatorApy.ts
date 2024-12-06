import { bulkUpdateDbTransactions } from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'
import { getStrategiesWithShareUnderlying, sharesToTVLStrategies } from '../utils/strategyShares'
import { withOperatorShares } from '../utils/operatorShares'
import { fetchTokenPrices } from '../utils/tokenPrices'
import Prisma from '@prisma/client'

export async function monitorOperatorApy() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		maxApy: Prisma.Prisma.Decimal
	}[] = []

	let skip = 0
	const take = 32

	const tokenPrices = await fetchTokenPrices()
	const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

	while (true) {
		try {
			// Fetch Avs data for all operators in this iteration
			const operatorMetrics = await prismaClient.operator.findMany({
				include: {
					shares: {
						select: { strategyAddress: true, shares: true }
					},
					avs: {
						where: { isActive: true },
						select: {
							avsAddress: true,
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
					}
				},
				orderBy: {
					createdAtBlock: 'asc'
				},
				skip,
				take
			})

			if (operatorMetrics.length === 0) break

			// Setup all db transactions for this iteration
			for (const operator of operatorMetrics) {
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
					let operatorEarningsEth = new Prisma.Prisma.Decimal(0)

					// Calc aggregate APY for each AVS basis the opted-in strategies
					for (const avs of avsWithEligibleRewardSubmissions) {
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
								(submission) =>
									submission.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
							)

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

							// Add strategy's APY to common strategy rewards store (across all Avs)
							const currentStrategyApy = strategyRewardsMap.get(strategyAddress) || 0
							strategyRewardsMap.set(strategyAddress, currentStrategyApy + apy)
						}
					}

					// Calculate max achievable APY
					if (strategyRewardsMap.size > 0) {
						const maxApy = new Prisma.Prisma.Decimal(Math.max(...strategyRewardsMap.values()))

						if (operator.maxApy !== maxApy) {
							data.push({
								address: operator.address,
								maxApy
							})
						}
					}
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Operator" AS o
					SET
						"maxApy" = o2."maxApy"
					FROM
						(
							VALUES
								${data.map((d) => `('${d.address}', ${d.maxApy})`).join(', ')}
						) AS o2 (address, "maxApy")
					WHERE
						o2.address = o.address;
				`

				dbTransactions.push(prismaClient.$executeRaw`${Prisma.Prisma.raw(query)}`)
			}
		} catch (error) {}
	}

	// Write to db
	if (dbTransactions.length > 0) {
		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Monitor] Updated Operator APYs: ${dbTransactions.length}`
		)
	}
}
