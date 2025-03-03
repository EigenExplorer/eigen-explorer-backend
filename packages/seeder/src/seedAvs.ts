import prisma from '@prisma/client'
import { type EntityMetadata, defaultMetadata } from './utils/metadata'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avs'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_avs'

interface AvsEntryRecord {
	metadataUrl: string
	metadata: EntityMetadata
	isMetadataSynced: boolean
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

export async function seedAvs(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const avsList: Map<string, AvsEntryRecord> = new Map()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] AVS MetadataURI from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_AVSMetadataURIUpdated.findMany({
				where: {
					blockNumber: {
						gt: fromBlock,
						lte: toBlock
					}
				}
			})

			for (const l in logs) {
				const log = logs[l]
				const avsAddress = String(log.avs).toLowerCase()
				const existingRecord = avsList.get(avsAddress)

				const blockNumber = BigInt(log.blockNumber)
				const timestamp = log.blockTime

				if (existingRecord) {
					// Avs has been registered before in this fetch
					avsList.set(avsAddress, {
						metadataUrl: log.metadataURI,
						metadata: defaultMetadata,
						isMetadataSynced: false,
						createdAtBlock: existingRecord.createdAtBlock,
						updatedAtBlock: blockNumber,
						createdAt: existingRecord.createdAt,
						updatedAt: timestamp
					})
				} else {
					// Avs being registered for the first time in this fetch
					avsList.set(avsAddress, {
						metadataUrl: log.metadataURI,
						metadata: defaultMetadata,
						isMetadataSynced: false,
						createdAtBlock: blockNumber,
						updatedAtBlock: blockNumber,
						createdAt: timestamp, // Will be omitted in upsert if avs exists in db
						updatedAt: timestamp
					})
				}
			}
		},
		10_000n
	)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avsOperator.deleteMany())
		dbTransactions.push(prismaClient.avs.deleteMany())

		const newAvs: prisma.Avs[] = []

		for (const [
			address,
			{
				metadataUrl,
				metadata,
				isMetadataSynced,
				createdAtBlock,
				updatedAtBlock,
				createdAt,
				updatedAt
			}
		] of avsList) {
			newAvs.push({
				address,
				metadataUrl,
				metadataName: metadata.name,
				metadataDescription: metadata.description,
				metadataLogo: metadata.logo,
				metadataDiscord: metadata.discord,
				metadataTelegram: metadata.telegram,
				metadataWebsite: metadata.website,
				metadataX: metadata.x,
				restakeableStrategies: [],
				isMetadataSynced,
				totalStakers: 0,
				totalOperators: 0,
				avsRegistrarAddress: '',
				maxApy: new prisma.Prisma.Decimal(0),
				tvlEth: new prisma.Prisma.Decimal(0),
				sharesHash: '',
				createdAtBlock,
				updatedAtBlock,
				createdAt,
				updatedAt
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
				isMetadataSynced,
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
						metadataUrl,
						metadataName: metadata.name,
						metadataDescription: metadata.description,
						metadataLogo: metadata.logo,
						metadataDiscord: metadata.discord,
						metadataTelegram: metadata.telegram,
						metadataWebsite: metadata.website,
						metadataX: metadata.x,
						isMetadataSynced,
						updatedAtBlock,
						updatedAt
					},
					create: {
						address,
						metadataUrl,
						metadataName: metadata.name,
						metadataDescription: metadata.description,
						metadataLogo: metadata.logo,
						metadataDiscord: metadata.discord,
						metadataTelegram: metadata.telegram,
						metadataWebsite: metadata.website,
						metadataX: metadata.x,
						restakeableStrategies: [],
						isMetadataSynced,
						totalStakers: 0,
						totalOperators: 0,
						createdAtBlock,
						updatedAtBlock,
						createdAt,
						updatedAt
					}
				})
			)
		}
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] AVS MetadataURI from: ${firstBlock} to: ${lastBlock} size: ${avsList.size}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
