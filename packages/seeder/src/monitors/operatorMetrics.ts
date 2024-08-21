import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'

export async function monitorOperatorMetrics() {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: { address: string; totalStakers: number; totalAvs: number }[] = []

	let skip = 0
	const take = 1000

	while (true) {
		try {
			// Fetch totalStakers & totalAvs for all operators in this iteration
			const operatorMetrics = await prismaClient.operator.findMany({
				select: {
					address: true,
					totalAvs: true,
					totalStakers: true,
					_count: {
						select: {
							stakers: true,
							avs: { where: { isActive: true } }
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

			// Setup all db transactions for this iteration
			for (const operator of operatorMetrics) {
				const totalStakers = operator._count.stakers
				const totalAvs = operator._count.avs

				if (
					operator.totalAvs !== totalAvs ||
					operator.totalStakers !== totalStakers
				) {
					data.push({
						address: operator.address,
						totalStakers: operator._count.stakers,
						totalAvs: operator._count.avs
					})
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Operator" AS o
					SET
						"totalStakers" = o2."totalStakers",
						"totalAvs" = o2."totalAvs"
					FROM
						(
							VALUES
								${data
									.map(
										(d) => `('${d.address}', ${d.totalStakers}, ${d.totalAvs})`
									)
									.join(', ')}
						) AS o2 (address, "totalStakers", "totalAvs")
					WHERE
						o2.address = o.address;
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
			`[Monitor] Updated Operator metrics: ${dbTransactions.length}`
		)
	}
}
