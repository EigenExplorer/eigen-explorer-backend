import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'
import { getNetwork } from '../utils/viemClient'

export async function monitorAvsMetrics() {
	const prismaClient = getPrismaClient()

	let skip = 0
	const take = 100

	while (true) {
		try {
			// Fetch totalStakers & totalOperators for all avs in this iteration
			const avsMetrics = await prismaClient.avs.findMany({
				where: getAvsFilterQuery(true),
				include: {
					operators: {
						where: { isActive: true },
					}
				},
				skip,
				take,
			})

			if (avsMetrics.length === 0) {
				break
			}

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			// Setup all db transactions for this iteration
			for (const avs of avsMetrics) {
				const totalStakers = await prismaClient.staker.count({
					where: {
						operatorAddress: {
							in: avs.operators.map(o => o.operatorAddress),
						},
						shares: {
							some: {
								strategyAddress: {
									in: [...new Set(avs.operators.flatMap(o => o.restakedStrategies))],
								},
								shares: { gt: "0" },
							},
						},
					},
				})

				const totalOperators = avs.operators.length

				dbTransactions.push(
					prismaClient.avs.update({
						where: {
							address: avs.address
						},
						data: {
							totalStakers,
							totalOperators
						}
					})
				)
			}

			// Write to db
			if (dbTransactions.length > 0) {
				await bulkUpdateDbTransactions(
					dbTransactions,
					`[Monitor] Updated AVS metrics: ${dbTransactions.length}`
				)
			}

			skip += take
		} catch (error) {}
	}

	console.log('[Monitor] All AVS metrics up-to-date')
}


function getAvsFilterQuery(filterName?: boolean) {
	const queryWithName = filterName
		? {
				OR: [
					{
						metadataName: { not: '' }
					}
				]
		  }
		: {}

	return getNetwork().testnet
		? {
				AND: [
					queryWithName,
					{
						OR: [
							{
								curatedMetadata: {
									isVisible: true
								}
							},
							{
								curatedMetadata: null
							}
						]
					}
				]
		  }
		: {
				AND: [
					queryWithName,
					{
						curatedMetadata: {
							isVisible: true
						}
					}
				]
		  }
}
