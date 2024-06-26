import { serviceManagerUIAbi } from './data/abi/serviceManagerUIAbi'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'
import { getViemClient } from './utils/viemClient'

export async function seedRestakedStrategies() {
	const prismaClient = getPrismaClient()
	const viemClient = getViemClient()

	const avsList = await prismaClient.avs.findMany({
		include: { operators: true }
	})

	for (const avs of avsList) {
		try {
			// Prepare db transaction object
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			const avsRestakeableStrategies = (await viemClient.readContract({
				address: avs.address as `0x${string}`,
				abi: serviceManagerUIAbi,
				functionName: 'getRestakeableStrategies'
			})) as string[]

			dbTransactions.push(
				prismaClient.avs.updateMany({
					where: { address: avs.address },
					data: {
						restakeableStrategies: avsRestakeableStrategies.map((s) =>
							s.toLowerCase()
						)
					}
				})
			)

			if (avs.operators.length > 0) {
				const operatorRestakedStrategies = await Promise.all(
					avs.operators.map((o) =>
						viemClient.readContract({
							address: avs.address as `0x${string}`,
							abi: serviceManagerUIAbi,
							functionName: 'getOperatorRestakedStrategies',
							args: [o.operatorAddress]
						})
					)
				)

				avs.operators.map((o, i) => {
					const strategies = operatorRestakedStrategies[i] as string[]

					if (strategies && strategies.length > 0) {
						dbTransactions.push(
							prismaClient.avsOperator.updateMany({
								where: {
									avsAddress: o.avsAddress,
									operatorAddress: o.operatorAddress
								},
								data: {
									restakedStrategies: strategies.map((s) => s.toLowerCase())
								}
							})
						)
					}
				})
			}

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Data] AVS Restaked Data addr: ${avs.address} size: ${dbTransactions.length}`
			)
		} catch (error) {}
	}
}
