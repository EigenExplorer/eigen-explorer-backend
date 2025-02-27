import prisma from '@prisma/client'
import { createHash } from 'crypto'
import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'
import { sharesToTVL, getStrategiesWithShareUnderlying } from '../utils/strategyShares'

interface MonitorOperatorMetricsParams {
	filterOperators?: string[]
}

export async function monitorOperatorMetrics(params: MonitorOperatorMetricsParams) {
	const prismaClient = getPrismaClient()

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	const data: {
		address: string
		totalStakers: number
		totalAvs: number
		tvlEth: number
		sharesHash: string
	}[] = []

	let skip = 0
	const take = 1000

	const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

	while (true) {
		try {
			// Fetch totalStakers & totalAvs for all operators in this iteration
			const operatorMetrics = await prismaClient.operator.findMany({
				where: params.filterOperators?.length
					? { address: { in: params.filterOperators } }
					: undefined,
				include: {
					shares: {
						select: { strategyAddress: true, shares: true }
					},
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
				const sharesHash = createHash('md5').update(JSON.stringify(operator.shares)).digest('hex')
				const totalStakers = operator._count.stakers
				const totalAvs = operator._count.avs

				if (
					operator.totalAvs !== totalAvs ||
					operator.totalStakers !== totalStakers ||
					operator.sharesHash !== sharesHash
				) {
					const tvlObject = sharesToTVL(operator.shares, strategiesWithSharesUnderlying)

					data.push({
						address: operator.address,
						totalStakers: operator._count.stakers,
						totalAvs: operator._count.avs,
						tvlEth: tvlObject.tvl,
						sharesHash
					})
				}
			}

			skip += take

			if (data.length > 0) {
				const query = `
					UPDATE "Operator" AS o
					SET
						"totalStakers" = o2."totalStakers",
						"totalAvs" = o2."totalAvs",
						"tvlEth" = o2."tvlEth",
						"sharesHash" = o2."sharesHash"
					FROM
						(
							VALUES
								${data
									.map(
										(d) =>
											`('${d.address}', ${d.totalStakers}, ${d.totalAvs}, ${d.tvlEth}, '${d.sharesHash}')`
									)
									.join(', ')}
						) AS o2 (address, "totalStakers", "totalAvs", "tvlEth", "sharesHash")
					WHERE
						o2.address = o.address;
				`

				dbTransactions.push(prismaClient.$executeRaw`${prisma.Prisma.raw(query)}`)
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
