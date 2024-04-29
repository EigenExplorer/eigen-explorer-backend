import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions, IMap } from './utils/seeder'

export async function seedOperatorShares(operatorAddresses: string[]) {
	const prismaClient = getPrismaClient()

	let currentIndex = 0
	let nextIndex = 0
	const totalOperators = await prismaClient.operator.count({
		where: { address: { in: operatorAddresses } }
	})

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	while (nextIndex < totalOperators) {
		nextIndex = currentIndex + 12

		const operators = await prismaClient.operator.findMany({
			where: { address: { in: operatorAddresses } },
			skip: currentIndex,
			take: 12,
			include: {
				stakers: {
					include: {
						shares: true
					}
				}
			}
		})

		operators.map((operator) => {
			const sharesMap: IMap<string, string> = new Map()

			operator.stakers.map((staker) => {
				staker.shares.map((s) => {
					if (!sharesMap.has(s.strategyAddress)) {
						sharesMap.set(s.strategyAddress, '0')
					}

					sharesMap.set(
						s.strategyAddress,
						(
							BigInt(sharesMap.get(s.strategyAddress)) + BigInt(s.shares)
						).toString()
					)
				})
			})

			for (const [strategyAddress, shares] of sharesMap) {
				dbTransactions.push(
					prismaClient.operatorStrategyShares.upsert({
						where: {
							operatorAddress_strategyAddress: {
								operatorAddress: operator.address,
								strategyAddress
							}
						},
						create: {
							operatorAddress: operator.address,
							strategyAddress,
							shares: shares.toString()
						},
						update: {
							shares: shares.toString()
						}
					})
				)
			}
		})

		currentIndex = nextIndex
	}

	await bulkUpdateDbTransactions(dbTransactions)

	console.log('Seeded operator shares: ', totalOperators)
}
