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
	const MAX_APY = 9999.9999

	const tokenPrices = await fetchTokenPrices()
	const tokenPriceMap = new Map(tokenPrices.map((tp) => [tp.address.toLowerCase(), tp]))
	const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

	const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
	startDate.setUTCHours(0, 0, 0, 0)

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
					}
				},
				orderBy: {
					createdAtBlock: 'asc'
				},
				skip,
				take
			})

			if (operatorMetrics.length === 0) break

			const operatorAvsSplits = await prismaClient.operatorAvsSplit.findMany({
				where: {
					operatorAddress: {
						in: operatorMetrics.map((op) => op.address.toLowerCase())
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

			const getSplit = (operatorAddress: string, avsAddress: string, timestamp: bigint): number => {
				const key = `${operatorAddress.toLowerCase()}:${avsAddress.toLowerCase()}`
				const splits = splitMap.get(key) || []
				const validSplit = splits
					.filter((split) => split.activatedAt <= timestamp)
					.sort((a, b) => Number(b.activatedAt) - Number(a.activatedAt))[0]
				return validSplit ? validSplit.splitBips / 100 : 10 // Default to 10%
			}

			for (const operator of operatorMetrics) {
				const strategyRewardsMap: Map<string, number> = new Map()
				const operatorStrategyTvlMap: Map<string, bigint> = new Map()

				operator.shares.forEach((share) =>
					operatorStrategyTvlMap.set(share.strategyAddress.toLowerCase(), BigInt(share.shares))
				)

				const pastYearStartSec = Math.floor(startDate.getTime() / 1000)
				// Filter AVS with eligible rewards
				const isEligibleReward = (reward: any) => {
					const endTimeSec = reward.startTimestamp + BigInt(reward.duration)
					return (
						(operatorStrategyTvlMap.get(reward.strategyAddress.toLowerCase()) ?? 0n) > 0n &&
						endTimeSec >= BigInt(pastYearStartSec) &&
						(!reward.operatorAddress ||
							reward.operatorAddress.toLowerCase() === operator.address.toLowerCase())
					)
				}

				const avsWithRewards = operator.avs.filter(
					(avsOp) =>
						avsOp.avs.rewardSubmissions.length > 0 ||
						avsOp.avs.operatorDirectedRewardSubmissions.length > 0
				)

				const avsWithEligibleRewardSubmissions = avsWithRewards
					.map((avsOp) => ({
						avs: avsOp.avs,
						eligibleRewards: [
							...avsOp.avs.rewardSubmissions.filter(isEligibleReward),
							...avsOp.avs.operatorDirectedRewardSubmissions.filter(isEligibleReward)
						],
						status: avsOp.isActive
					}))
					.filter((item) => item.eligibleRewards.length > 0)

				if (avsWithEligibleRewardSubmissions.length > 0) {
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
						for (const strategyAddress of avs.restakeableStrategies) {
							const strategyAddressLower = strategyAddress.toLowerCase()
							if (
								!operatorStrategyTvlMap.has(strategyAddressLower) ||
								operatorStrategyTvlMap.get(strategyAddressLower) === 0n
							) {
								// Add strategy's APY to common strategy rewards store (across all Avs)
								const currentStrategyApy = strategyRewardsMap.get(strategyAddressLower) || 0
								strategyRewardsMap.set(strategyAddressLower, currentStrategyApy + 0)
								continue
							}

							const strategyTvl = tvlStrategiesEth[strategyAddressLower] || 0
							if (strategyTvl === 0) continue

							let totalRewardsEth = new Prisma.Prisma.Decimal(0)
							const timeSegments: { start: number; end: number }[] = []

							// Find all reward submissions attributable to the strategy
							const relevantSubmissions = eligibleRewards.filter(
								(submission) => submission.strategyAddress.toLowerCase() === strategyAddressLower
							)

							if (!relevantSubmissions || relevantSubmissions.length === 0) continue

							for (const submission of relevantSubmissions) {
								let rewardIncrementEth = new Prisma.Prisma.Decimal(0)
								const rewardTokenAddress = submission.token.toLowerCase()

								// Normalize reward amount to its ETH price
								if (rewardTokenAddress) {
									const tokenPrice = tokenPriceMap.get(rewardTokenAddress)
									const operatorSplit = getSplit(
										operator.address,
										avsAddressLower,
										submission.startTimestamp
									)
									rewardIncrementEth = submission.amount
										.mul(new Prisma.Prisma.Decimal(tokenPrice?.ethPrice ?? 0))
										.div(new Prisma.Prisma.Decimal(10).pow(tokenPrice?.decimals ?? 18))
										.mul(100 - operatorSplit)
										.div(100)
								}

								totalRewardsEth = status
									? totalRewardsEth.add(rewardIncrementEth)
									: new Prisma.Prisma.Decimal(0)
								timeSegments.push({
									start: Number(submission.startTimestamp),
									end: Number(submission.startTimestamp) + submission.duration
								})
							}

							if (timeSegments.length === 0) continue

							const sortedSegments = timeSegments.sort((a, b) => a.start - b.start)
							const mergedSegments: { start: number; end: number }[] = []
							let currentSegment = sortedSegments[0]

							for (let i = 1; i < sortedSegments.length; i++) {
								const nextSegment = sortedSegments[i]
								if (nextSegment.start <= currentSegment.end) {
									currentSegment.end = Math.max(currentSegment.end, nextSegment.end)
								} else {
									mergedSegments.push(currentSegment)
									currentSegment = nextSegment
								}
							}
							mergedSegments.push(currentSegment)

							const totalDuration = mergedSegments.reduce(
								(sum, seg) => sum + (seg.end - seg.start),
								0
							)
							if (totalDuration === 0) continue

							// Annualize the reward basis its duration to find yearly APY
							const rewardRate = totalRewardsEth.toNumber() / strategyTvl
							const annualizedRate = rewardRate * ((365 * 24 * 60 * 60) / totalDuration)
							const apy = annualizedRate * 100

							// Add strategy's APY to common strategy rewards store (across all Avs)
							const currentStrategyApy = strategyRewardsMap.get(strategyAddressLower) || 0
							strategyRewardsMap.set(strategyAddressLower, currentStrategyApy + apy)
						}
					}

					// Calculate max achievable APY
					if (strategyRewardsMap.size > 0) {
						const maxApy = new Prisma.Prisma.Decimal(
							Math.min(Math.max(...strategyRewardsMap.values()), MAX_APY)
						)

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
