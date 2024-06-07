import { getPrismaClient } from '../utils/prismaClient'
import { fetchWithTimeout, bulkUpdateDbTransactions } from '../utils/seeder'
import { isValidMetadataUrl, validateMetadata } from '../utils/metadata'

export async function monitorAvsMetadata() {
	const prismaClient = getPrismaClient()

	let skip = 0
	const take = 100

	while (true) {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []

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
					const response = await fetchWithTimeout(record.metadataUrl)
					const data = response ? await response.text() : ''
					const avsMetadata = validateMetadata(data)

					if (avsMetadata) {
						dbTransactions.push(
							prismaClient.avs.update({
								where: { address: record.address },
								data: {
									metadataName: avsMetadata.name,
									metadataDescription: avsMetadata.description,
									metadataLogo: avsMetadata.logo,
									metadataDiscord: avsMetadata.discord,
									metadataTelegram: avsMetadata.telegram,
									metadataWebsite: avsMetadata.website,
									metadataX: avsMetadata.x,
									isMetadataSynced: true
								}
							})
						)
					} else {
						throw new Error('Invalid avs metadata uri')
					}
				} else {
					throw new Error('Invalid avs metadata uri')
				}
			} catch (error) {}
		}

		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Monitor] Updated AVS metadatas: ${avsEntries.length}`
		)
		skip += take
	}

	console.log('[Monitor] All AVS metadatas up-to-date')
}
