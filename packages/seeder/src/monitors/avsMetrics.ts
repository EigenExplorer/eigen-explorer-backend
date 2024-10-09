import prisma from '@prisma/client'
import { createHash } from 'crypto'
import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions, IMap } from '../utils/seeder'
import {
	EigenStrategiesContractAddress,
	getEigenContracts
} from '../data/address'
import { fetchStrategyTokenPrices, TokenPrices } from '../utils/tokenPrices'
import { getStrategiesWithShareUnderlying } from '../metrics/seedMetricsTvl'

export async function monitorAvsMetrics() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		totalStakers: number
		totalOperators: number
		tvlEth: number
		sharesHash: string
	}[] = []

	let skip = 0
	const take = 1000

	const strategyTokenPrices = await fetchStrategyTokenPrices()
	const strategiesWithSharesUnderlying =
		await getStrategiesWithShareUnderlying()

	while (true) {
		try {
			// Fetch totalStakers & totalOperators for all avs in this iteration
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
					}
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
					(s) =>
						avs.restakeableStrategies.indexOf(
							s.strategyAddress.toLowerCase()
						) !== -1
				)

				const sharesHash = createHash('md5')
					.update(JSON.stringify(shares))
					.digest('hex')

				const totalOperators = avs.operators.length
				const totalStakers = await prismaClient.staker.count({
					where: {
						operatorAddress: {
							in: avs.operators.map((o) => o.operatorAddress)
						},
						shares: {
							some: {
								strategyAddress: {
									in: avs.restakeableStrategies
								},
								shares: { gt: '0' }
							}
						}
					}
				})

				if (
					avs.totalOperators !== totalOperators ||
					avs.totalStakers !== totalStakers ||
					avs.sharesHash !== sharesHash
				) {
					const tvlObject = sharesToTVL(
						shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
					)

					data.push({
						address: avs.address,
						totalStakers,
						totalOperators,
						tvlEth: tvlObject.tvl,
						sharesHash
					})
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Avs" AS a
					SET
						"totalStakers" = a2."totalStakers",
						"totalOperators" = a2."totalOperators",
						"tvlEth" = a2."tvlEth",
						"sharesHash" = a2."sharesHash"
					FROM
						(
							VALUES
								${data
									.map(
										(d) =>
											`('${d.address}', ${d.totalStakers}, ${d.totalOperators}, ${d.tvlEth}, '${d.sharesHash}')`
									)
									.join(', ')}
						) AS a2 (address, "totalStakers", "totalOperators", "tvlEth", "sharesHash")
					WHERE
						a2.address = a.address;
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
			`[Monitor] Updated AVS metrics: ${dbTransactions.length}`
		)
	}
}

// Helper methods
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

export function sharesToTVL(
	shares: {
		strategyAddress: string
		shares: string
	}[],
	strategiesWithSharesUnderlying: Map<string, bigint>,
	strategyTokenPrices: TokenPrices
) {
	const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'

	const beaconStrategy = shares.find(
		(s) => s.strategyAddress.toLowerCase() === beaconAddress
	)
	const restakingStrategies = shares.filter(
		(s) => s.strategyAddress.toLowerCase() !== beaconAddress
	)

	const tvlBeaconChain = beaconStrategy
		? Number(beaconStrategy.shares) / 1e18
		: 0

	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategies = Object.values(getEigenContracts().Strategies)

	let tvlRestaking = 0
	const tvlStrategies: Map<keyof EigenStrategiesContractAddress, number> =
		new Map(
			strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
		)
	const tvlStrategiesEth: Map<keyof EigenStrategiesContractAddress, number> =
		new Map(
			strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
		)

	restakingStrategies.map((s) => {
		const foundStrategyIndex = strategies.findIndex(
			(si) =>
				si.strategyContract.toLowerCase() === s.strategyAddress.toLowerCase()
		)

		const strategyTokenPrice = Object.values(strategyTokenPrices).find(
			(stp) =>
				stp.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
		)
		const sharesUnderlying = strategiesWithSharesUnderlying.get(
			s.strategyAddress.toLowerCase()
		)

		if (foundStrategyIndex !== -1 && sharesUnderlying) {
			const strategyShares =
				Number((BigInt(s.shares) * BigInt(sharesUnderlying)) / BigInt(1e18)) /
				1e18

			tvlStrategies.set(
				strategyKeys[
					foundStrategyIndex
				] as keyof EigenStrategiesContractAddress,
				strategyShares
			)

			if (strategyTokenPrice) {
				const strategyTvl = strategyShares * strategyTokenPrice.eth

				tvlStrategiesEth.set(
					strategyKeys[
						foundStrategyIndex
					] as keyof EigenStrategiesContractAddress,
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
