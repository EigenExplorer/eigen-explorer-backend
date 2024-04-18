import { getContract } from 'viem'
import { delegationManagerAbi } from './data/abi/delegationManager'
import { getEigenContracts } from './data/address'
import { getPrismaClient } from './prisma/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'
import { getViemClient } from './viem/viemClient'

export async function seedOperatorShares() {
	console.log('Seeding operator shares ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const operators = await prismaClient.operator.findMany({
		where: { stakers: { isEmpty: false } },
		select: { address: true }
	})
	const operatorAddresses = operators.map((o) => o.address)

	const batchSize = 50
	let currentIndex = 0

	const contract = getContract({
		address: getEigenContracts().DelegationManager,
		abi: delegationManagerAbi,
		client: viemClient
	})

	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategyContracts = strategyKeys.map(
		(s) => getEigenContracts().Strategies[s].strategyContract
	) as `0x${string}`[]

	while (currentIndex < operatorAddresses.length) {
		const batch = operatorAddresses.slice(
			currentIndex,
			currentIndex + batchSize
		)
		console.log(
			`Seeding operator shares batch ${
				Math.floor(currentIndex / batchSize) + 1
			}`
		)

		const operatorSharesData = (await Promise.all(
			batch.map((address) => {
				return contract.read.getOperatorShares([address, strategyContracts])
			})
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		)) as any

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []

		batch.map((address, i) => {
			dbTransactions.push(
				prismaClient.operator.update({
					where: { address },
					data: {
						shares: {
							set: operatorSharesData[i].map((share: bigint, i: number) => ({
								shares: share.toString(),
								strategy: strategyContracts[i]
							}))
						}
					}
				})
			)
		})

		await bulkUpdateDbTransactions(dbTransactions)

		currentIndex += batchSize
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}

	console.log('Seeded opertor shares:', operatorAddresses.length)
}
