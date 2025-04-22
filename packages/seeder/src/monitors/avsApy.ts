import Prisma from '@prisma/client'
import { bulkUpdateDbTransactions } from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'
import { sharesToTVLStrategies, getStrategiesWithShareUnderlying } from '../utils/strategyShares'
import { withOperatorShares } from '../utils/operatorShares'
import { fetchTokenPrices } from '../utils/tokenPrices'

export async function monitorAvsApy() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		maxApy: Prisma.Prisma.Decimal
	}[] = []

	let skip = 0
	const take = 32
	const MAX_APY = 9999.9999

	const tokenPrices = await fetchTokenPrices()
	const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

	while (true) {
		try {
			// Fetch totalStakers, totalOperators & rewards data for all avs in this iteration
			const avsMetrics = await prismaClient.avs.findMany({
				where: {
					rewardSubmissions: {
						some: {}
					}
				},
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

			if (avsMetrics.length === 0) break

			// Setup all db transactions for this iteration
			for (const avs of avsMetrics) {
				const strategyRewardsMap: Map<string, number> = new Map()

				const shares = withOperatorShares(avs.operators).filter(
					(s) => avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
				)

				if (avs.rewardSubmissions.length > 0) {
					// Fetch the AVS tvl for each strategy
					const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)

					// Iterate through each strategy and calculate all its rewards
					for (const strategyAddress of avs.restakeableStrategies) {
						const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
						if (strategyTvl === 0) continue

						let totalRewardsEth = new Prisma.Prisma.Decimal(0)
						let totalDuration = 0

						// Find all reward submissions attributable to the strategy
						const relevantSubmissions = avs.rewardSubmissions.filter(
							(submission) =>
								submission.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
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
									.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18)) // No decimals
							}

							totalRewardsEth = totalRewardsEth.add(rewardIncrementEth) // No decimals
							totalDuration += submission.duration
						}

						if (totalDuration === 0) continue

						// Annualize the reward basis its duration to find yearly APY
						const rewardRate = totalRewardsEth.toNumber() / strategyTvl
						const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
						const apy = annualizedRate * 100

						strategyRewardsMap.set(strategyAddress, apy)
					}

					// Calculate max achievable APY
					if (strategyRewardsMap.size > 0) {
						const maxApy = new Prisma.Prisma.Decimal(
							Math.min(Math.max(...strategyRewardsMap.values()), MAX_APY)
						)

						if (avs.maxApy !== maxApy) {
							data.push({
								address: avs.address,
								maxApy
							})
						}
					}
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Avs" AS a
					SET
						"maxApy" = a2."maxApy"
					FROM
						(
							VALUES
								${data.map((d) => `('${d.address}', ${d.maxApy})`).join(', ')}
						) AS a2 (address, "maxApy")
					WHERE
						a2.address = a.address;
				`
				dbTransactions.push(prismaClient.$executeRaw`${Prisma.Prisma.raw(query)}`)
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
