import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'
import { getNetwork } from '../utils/viemClient'

export async function monitorAvsMetrics() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		totalStakers: number
		totalOperators: number
	}[] = []

	let skip = 0
	const take = 1000

	while (true) {
		try {
			// Fetch totalStakers & totalOperators for all avs in this iteration
			const avsMetrics = await prismaClient.avs.findMany({
				include: {
					operators: {
						where: { isActive: true }
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

				const totalOperators = avs.operators.length

				if (
					avs.totalOperators !== totalOperators ||
					avs.totalStakers !== totalStakers
				) {
					data.push({ address: avs.address, totalStakers, totalOperators })
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Avs" AS a
					SET
						"totalStakers" = a2."totalStakers",
						"totalOperators" = a2."totalOperators"
					FROM
						(
							VALUES
								${data
									.map(
										(d) =>
											`('${d.address}', ${d.totalStakers}, ${d.totalOperators})`
									)
									.join(', ')}
						) AS a2 (address, "totalStakers", "totalOperators")
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
