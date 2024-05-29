import { getPrismaClient } from '../utils/prismaClient'
import type { EntityMetadata } from '../utils/metadata'
import { fetchWithTimeout, bulkUpdateDbTransactions } from '../utils/seeder'
import { isValidMetadataUrl, validateMetadata } from '../utils/metadata'

export async function monitorAvsMetadata() {
	console.log('Monitoring AVS Metadata...')

	const prismaClient = getPrismaClient()
	const metadataList: Map<string, EntityMetadata> = new Map()

	let skip = 0
	const take = 100

	while (true) {
		const avsEntries = await prismaClient.avs.findMany({
			where: {
				isMetadataSynced: false
			},
			take: take,
			skip: skip,
			orderBy: {
				createdAtBlock: 'asc'
			}
		})

		if (avsEntries.length === 0) {
			break
		}

		for (const record of avsEntries) {
			try {
				if (record.metadataUrl && isValidMetadataUrl(record.metadataUrl)) {
					const response = await fetchWithTimeout(record.metadataUrl, 60000)
					const data = response ? await response.text() : ''
					const avsMetadata = validateMetadata(data)

					if (avsMetadata) {
						metadataList.set(record.address, avsMetadata)
					} else {
						throw new Error('Invalid avs metadata uri')
					}
				} else {
					throw new Error('Invalid avs metadata uri')
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
			prismaClient.avs.update({
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

	console.log('Updated AVS metadatas: ', metadataList.size)
}
