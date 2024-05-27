import type prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { isValidMetadataUrl, validateMetadata } from './utils/metadata'
import { type EntityMetadata, defaultMetadata } from './utils/metadata'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avs'

interface AvsEntryRecord {
	metadataUrl: string
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
	console.log('Seeding AVS ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const avsList: Map<string, AvsEntryRecord> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().AVSDirectory,
			event: parseAbiItem(
				'event AVSMetadataURIUpdated(address indexed avs, string metadataURI)'
			),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const avsAddress = String(log.args.avs).toLowerCase()
			const existingRecord = avsList.get(avsAddress)
			const metadataUrl = log.args.metadataURI

			const blockNumber = BigInt(log.blockNumber)
			const block = await viemClient.getBlock({ blockNumber: blockNumber })
			const timestamp = new Date(Number(block.timestamp) * 1000)

			try {
				if (metadataUrl && isValidMetadataUrl(metadataUrl)) {
					const response = await fetch(metadataUrl)
					const data = await response.text()
					const avsMetadata = validateMetadata(data)

					if (avsMetadata) {
						if (existingRecord) {
							// Avs already registered, valid metadata uri
							avsList.set(avsAddress, {
								metadataUrl: metadataUrl,
								metadata: avsMetadata,
								createdAtBlock: existingRecord.createdAtBlock,
								updatedAtBlock: blockNumber,
								createdAt: existingRecord.createdAt,
								updatedAt: timestamp
							})
						} else {
							// Avs not registered, valid metadata uri
							avsList.set(avsAddress, {
								metadataUrl: metadataUrl,
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
						metadataUrl: '',
						metadata: defaultMetadata,
						createdAtBlock: blockNumber,
						updatedAtBlock: blockNumber,
						createdAt: timestamp,
						updatedAt: timestamp
					})
				} // Ignore case where Avs is already registered and is updated with invalid metadata uri
			}
		}

		console.log(
			`Avs registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avs.deleteMany())

		const newAvs: prisma.Avs[] = []

		for (const [
			address,
			{
				metadataUrl,
				metadata,
				createdAtBlock,
				updatedAtBlock,
				createdAt,
				updatedAt
			}
		] of avsList) {
			newAvs.push({
				address,
				metadataUrl: metadataUrl,
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
			{
				metadataUrl,
				metadata,
				createdAtBlock,
				updatedAtBlock,
				createdAt,
				updatedAt
			}
		] of avsList) {
			dbTransactions.push(
				prismaClient.avs.upsert({
					where: { address },
					update: {
						metadataUrl: metadataUrl,
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
						metadataUrl: metadataUrl,
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
