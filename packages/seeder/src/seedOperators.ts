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

const blockSyncKey = 'lastSyncedBlock_operators'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operators'

interface OperatorEntryRecord {
	metadataUrl: string
	metadata: EntityMetadata
	isMetadataSynced: boolean
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

export async function seedOperators(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const operatorList: Map<string, OperatorEntryRecord> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock
		? toBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(
			`[In Sync] [Data] Operator MetadataURI from: ${firstBlock} to: ${lastBlock}`
		)
		return
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs =
				await prismaClient.eventLogs_OperatorMetadataURIUpdated.findMany({
					where: {
						blockNumber: {
							gt: fromBlock,
							lte: toBlock
						}
					}
				})

			for (const l in logs) {
				const log = logs[l]

				const operatorAddress = String(log.operator).toLowerCase()
				const existingRecord = operatorList.get(operatorAddress)

				const blockNumber = BigInt(log.blockNumber)
				const timestamp = log.blockTime

				if (existingRecord) {
					// Operator has been registered before in this fetch
					operatorList.set(operatorAddress, {
						metadataUrl: log.metadataURI,
						metadata: defaultMetadata,
						isMetadataSynced: false,
						createdAtBlock: existingRecord.createdAtBlock,
						updatedAtBlock: blockNumber,
						createdAt: existingRecord.createdAt,
						updatedAt: timestamp
					})
				} else {
					// Operator being registered for the first time in this fetch
					operatorList.set(operatorAddress, {
						metadataUrl: log.metadataURI,
						metadata: defaultMetadata,
						isMetadataSynced: false,
						createdAtBlock: blockNumber, // Will be omitted in upsert if operator exists in db
						updatedAtBlock: blockNumber,
						createdAt: timestamp,
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
		dbTransactions.push(prismaClient.operator.deleteMany())

		const newOperator: prisma.Operator[] = []

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
		] of operatorList) {
			newOperator.push({
				address,
				metadataUrl,
				metadataName: metadata.name,
				metadataDescription: metadata.description,
				metadataLogo: metadata.logo,
				metadataDiscord: metadata.discord,
				metadataTelegram: metadata.telegram,
				metadataWebsite: metadata.website,
				metadataX: metadata.x,
				isMetadataSynced,
				totalStakers: 0,
				totalAvs: 0,
				createdAtBlock,
				updatedAtBlock,
				createdAt,
				updatedAt
			})
		}

		dbTransactions.push(
			prismaClient.operator.createMany({
				data: newOperator,
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
		] of operatorList) {
			dbTransactions.push(
				prismaClient.operator.upsert({
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
						isMetadataSynced,
						totalStakers: 0,
						totalAvs: 0,
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
		`[Data] Operator MetadataURI from: ${firstBlock} to: ${lastBlock} size: ${operatorList.size}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
