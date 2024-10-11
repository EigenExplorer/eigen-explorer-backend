import prisma from '@prisma/client'
import { createHash } from 'crypto'
import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL
} from '../../../api/src/utils/strategyShares'
import { withOperatorShares } from '../../../api/src/utils/operatorShares'

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

	const strategiesWithSharesUnderlying = await getStrategiesWithShareUnderlying()

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
					(s) => avs.restakeableStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
				)

				const sharesHash = createHash('md5').update(JSON.stringify(shares)).digest('hex')

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
					const tvlObject = sharesToTVL(shares, strategiesWithSharesUnderlying)

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
				dbTransactions.push(prismaClient.$executeRaw`${prisma.Prisma.raw(query)}`)
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
