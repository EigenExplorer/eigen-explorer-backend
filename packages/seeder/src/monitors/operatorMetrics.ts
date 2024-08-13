import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'

export async function monitorOperatorMetrics() {
	const prismaClient = getPrismaClient()

	let skip = 0
	const take = 100

	while (true) {
		try {
			// Fetch totalStakers & totalAvs for all operators in this iteration
			const operatorMetrics = await prismaClient.operator.findMany({
				select: {
					address: true,
					_count: {
						select: {
							stakers: true,
							avs: true
						}
					}
				},
				orderBy: {
					createdAtBlock: 'asc'
				},
				skip,
				take
			})

			if (operatorMetrics.length === 0) {
				break
			}

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			// Setup all db transactions for this iteration
			for (const operator of operatorMetrics) {
				dbTransactions.push(
					prismaClient.operator.update({
						where: {
							address: operator.address
						},
						data: {
							totalStakers: operator._count.stakers,
							totalAvs: operator._count.avs
						}
					})
				)
			}

			// Write to db
			if (dbTransactions.length > 0) {
				await bulkUpdateDbTransactions(
					dbTransactions,
					`[Monitor] Updated Operator metrics: ${dbTransactions.length}`
				)
			}

			skip += take
		} catch (error) {}
	}

	console.log('[Monitor] All Operator metrics up-to-date')
}
