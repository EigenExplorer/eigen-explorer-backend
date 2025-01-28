import { getPrismaClient } from '../utils/prismaClient'
import { fetchWithTimeout, bulkUpdateDbTransactions } from '../utils/seeder'
import { validateMetadata } from '../utils/metadata'

export async function monitorOperatorMetadata() {
	const prismaClient = getPrismaClient()

	let skip = 0
	const take = 100

	while (true) {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []

		const operatorEntries = await prismaClient.operator.findMany({
			where: {
				metadataUrl: {
					not: ''
				},
				isMetadataSynced: false
			},
			take: take,
			skip: skip,
			orderBy: {
				createdAtBlock: 'asc'
			}
		})

		console.log('[Monitor] Updating Operator metadatas: ', operatorEntries.length)

		if (operatorEntries.length === 0) {
			break
		}

		for (const record of operatorEntries) {
			try {
				if (record.metadataUrl) {
					const response = await fetchWithTimeout(record.metadataUrl)
					const data = response ? await response.text() : ''
					const operatorMetadata = validateMetadata(data)

					if (operatorMetadata) {
						dbTransactions.push(
							prismaClient.operator.update({
								where: { address: record.address },
								data: {
									metadataName: operatorMetadata.name,
									metadataDescription: operatorMetadata.description,
									metadataLogo: operatorMetadata.logo,
									metadataDiscord: operatorMetadata.discord,
									metadataTelegram: operatorMetadata.telegram,
									metadataWebsite: operatorMetadata.website,
									metadataX: operatorMetadata.x,
									isMetadataSynced: true
								}
							})
						)
					} else {
						throw new Error('Invalid operator metadata uri')
					}
				} else {
					throw new Error('Invalid operator metadata uri')
				}
			} catch (error) {}
		}

		if (dbTransactions.length > 0) {
			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Monitor] Updated Operator metadatas: ${dbTransactions.length}`
			)
		}
		skip += take
	}

	console.log('[Monitor] All Operator metadatas up-to-date')
}
