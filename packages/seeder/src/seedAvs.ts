import type prisma from '@prisma/client'
import { isValidMetadataUrl, validateMetadata } from './utils/metadata'
import { type EntityMetadata, defaultMetadata } from './utils/metadata'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avs'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_avs'

interface AvsEntryRecord {
	metadata: EntityMetadata
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

/**
 * Utility function to seed avs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedAvs(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const avsList: Map<string, AvsEntryRecord> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	console.log(`Seeding AVS from ${firstBlock} - ${lastBlock}`)

	const logs = await prismaClient.eventLogs_AVSMetadataURIUpdated.findMany({
		where: {
			blockNumber: {
				gte: firstBlock,
				lte: lastBlock
			}
		}
	})

	for (const l in logs) {
		const log = logs[l]

		const avsAddress = String(log.avs).toLowerCase()
		const existingRecord = avsList.get(avsAddress)

		const blockNumber = BigInt(log.blockNumber)
		const timestamp = log.blockTime

		
		/* Commented out for testing until merge with #75
		try {
			if (log.metadataURI && isValidMetadataUrl(log.metadataURI)) {
				const response = await fetch(log.metadataURI)
				const data = await response.text()
				const avsMetadata = validateMetadata(data)

				if (avsMetadata) {
					if (existingRecord) {
						// Avs already registered, valid metadata uri
						avsList.set(avsAddress, {
							metadata: avsMetadata,
							createdAtBlock: existingRecord.createdAtBlock,
							updatedAtBlock: blockNumber,
							createdAt: existingRecord.createdAt,
							updatedAt: timestamp
						})
					} else {
						// Avs not registered, valid metadata uri
						avsList.set(avsAddress, {
							metadata: avsMetadata,
							createdAtBlock: blockNumber,
							updatedAtBlock: blockNumber,
							createdAt: timestamp,
							updatedAt: timestamp
						})
					}
				} else {
					throw new Error('Missing avs metadata')
				}
			} else {
				throw new Error('Invalid avs metadata uri')
			}
		} catch (error) {
			if (!existingRecord) {
				// Avs not registered, invalid metadata uri
				avsList.set(avsAddress, {
					metadata: defaultMetadata,
					createdAtBlock: blockNumber,
					updatedAtBlock: blockNumber,
					createdAt: timestamp,
					updatedAt: timestamp
				})
			} // Ignore case where Avs is already registered and is updated with invalid metadata uri
		} */

		// Seeding without metadata
		if (existingRecord) {
			// Avs already registered
			avsList.set(avsAddress, {
				metadata: defaultMetadata,
				createdAtBlock: existingRecord.createdAtBlock,
				updatedAtBlock: blockNumber,
				createdAt: existingRecord.createdAt,
				updatedAt: timestamp
			})
		} else {
			// Avs not registered
			avsList.set(avsAddress, {
				metadata: defaultMetadata,
				createdAtBlock: blockNumber,
				updatedAtBlock: blockNumber,
				createdAt: timestamp,
				updatedAt: timestamp
			})
		}
	}

	console.log(
		`Avs registered between blocks ${firstBlock} ${lastBlock}: ${logs.length}`
	) 

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avs.deleteMany())

		const newAvs: prisma.Avs[] = []

		for (const [
			address,
			{ metadata, createdAtBlock, updatedAtBlock, createdAt, updatedAt }
		] of avsList) {
			newAvs.push({
				address,
				metadataName: metadata.name,
				metadataDescription: metadata.description,
				metadataLogo: metadata.logo,
				metadataDiscord: metadata.discord,
				metadataTelegram: metadata.telegram,
				metadataWebsite: metadata.website,
				metadataX: metadata.x,
				createdAtBlock: createdAtBlock,
				updatedAtBlock: updatedAtBlock,
				createdAt: createdAt,
				updatedAt: updatedAt
			})
		}

		dbTransactions.push(
			prismaClient.avs.createMany({
				data: newAvs,
				skipDuplicates: true
			})
		)
	} else {
		for (const [
			address,
			{ metadata, createdAtBlock, updatedAtBlock, createdAt, updatedAt }
		] of avsList) {
			dbTransactions.push(
				prismaClient.avs.upsert({
					where: { address },
					update: {
						metadataName: metadata.name,
						metadataDescription: metadata.description,
						metadataLogo: metadata.logo,
						metadataDiscord: metadata.discord,
						metadataTelegram: metadata.telegram,
						metadataWebsite: metadata.website,
						metadataX: metadata.x,
						updatedAtBlock: updatedAtBlock,
						updatedAt: updatedAt
					},
					create: {
						address,
						metadataName: metadata.name,
						metadataDescription: metadata.description,
						metadataLogo: metadata.logo,
						metadataDiscord: metadata.discord,
						metadataTelegram: metadata.telegram,
						metadataWebsite: metadata.website,
						metadataX: metadata.x,
						createdAtBlock: createdAtBlock,
						updatedAtBlock: updatedAtBlock,
						createdAt: createdAt,
						updatedAt: updatedAt
					}
				})
			)
		}
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded AVS:', avsList.size)
}
