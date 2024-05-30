import { getPrismaClient } from '../utils/prismaClient'
import type { EntityMetadata } from '../utils/metadata'
import { fetchWithTimeout, bulkUpdateDbTransactions } from '../utils/seeder'
import { isValidMetadataUrl, validateMetadata } from '../utils/metadata'

export async function monitorOperatorMetadata() {
	console.log('Monitoring Operator Metadata...')

	const prismaClient = getPrismaClient()
	const metadataList: Map<string, EntityMetadata> = new Map()

	let skip = 0
	const take = 100

	while (true) {
		const operatorEntries = await prismaClient.operator.findMany({
			where: {
				isMetadataSynced: false
			},
			take: take,
			skip: skip,
			orderBy: {
				createdAtBlock: 'asc'
			}
		})

		if (operatorEntries.length === 0) {
			break
		}

		for (const record of operatorEntries) {
			try {
				if (record.metadataUrl && isValidMetadataUrl(record.metadataUrl)) {
					const response = await fetchWithTimeout(record.metadataUrl)
					const data = response ? await response.text() : ''
					const operatorMetadata = validateMetadata(data)

					if (operatorMetadata) {
						metadataList.set(record.address, operatorMetadata)
					} else {
						throw new Error('Invalid operator metadata uri')
					}
				} else {
					throw new Error('Invalid operator metadata uri')
				}
			} catch (error) {}
		}
		skip += take
	}

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	for (const [address, metadata] of metadataList) {
		dbTransactions.push(
			prismaClient.operator.update({
				where: { address },
				data: {
					metadataName: metadata.name,
					metadataDescription: metadata.description,
					metadataLogo: metadata.logo,
					metadataDiscord: metadata.discord,
					metadataTelegram: metadata.telegram,
					metadataWebsite: metadata.website,
					metadataX: metadata.x,
					isMetadataSynced: true
				}
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	console.log('Updated Operator metadatas: ', metadataList.size)
}
