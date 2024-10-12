import Prisma from '@prisma/client'
import { bulkUpdateDbTransactions } from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'
import {
	sharesToTVLStrategies,
	getStrategiesWithShareUnderlying
} from '../../../api/src/utils/strategyShares'
import { withOperatorShares } from '../../../api/src/utils/operatorShares'
import { fetchTokenPrices } from '../../../api/src/utils/tokenPrices'

export async function monitorAvsApy() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		apy: Prisma.Prisma.Decimal
	}[] = []

	let skip = 0
	const take = 32

	const tokenPrices = await fetchTokenPrices()
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

				let apy = new Prisma.Prisma.Decimal(0)

				if (avs.rewardSubmissions.length > 0) {
					// Fetch the AVS tvl for each strategy
					const tvlStrategiesEth = sharesToTVLStrategies(shares, strategiesWithSharesUnderlying)

					// Iterate through each strategy and calculate all its rewards
					const strategiesApy = avs.restakeableStrategies.map((strategyAddress) => {
						const strategyTvl = tvlStrategiesEth[strategyAddress.toLowerCase()] || 0
						if (strategyTvl === 0) return { strategyAddress, apy: 0 }

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
								rewardIncrementEth = submission.amount.mul(
									new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0)
								)
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
							totalRewardsEth.div(new Prisma.Prisma.Decimal(10).pow(18)).toNumber() / strategyTvl
						const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
						const apy = annualizedRate * 100

						return { strategyAddress, apy }
					})

					// Calculate aggregate APY across strategies
					apy = new Prisma.Prisma.Decimal(
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
