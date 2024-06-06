import type prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	type EntityMetadata,
	defaultMetadata,
	isValidMetadataUrl,
	validateMetadata
} from './utils/metadata'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operators'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operators'

interface OperatorEntryRecord {
	metadata: EntityMetadata
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

	console.log(`Seeding Operators from ${firstBlock} - ${lastBlock}`)

	const logs = await prismaClient.eventLogs_OperatorMetadataURIUpdated.findMany(
		{
			where: {
				blockNumber: {
					gt: firstBlock,
					lte: lastBlock
				}
			}
		}
	)

	for (const l in logs) {
		const log = logs[l]

		const operatorAddress = String(log.operator).toLowerCase()
		const existingRecord = operatorList.get(operatorAddress)

		const blockNumber = BigInt(log.blockNumber)
		const timestamp = log.blockTime

		try {
			if (log.metadataURI && isValidMetadataUrl(log.metadataURI)) {
				const response = await fetch(log.metadataURI)
				const data = await response.text()
				const operatorMetadata = validateMetadata(data)

				if (operatorMetadata) {
					if (existingRecord) {
						// Operator already registered, valid metadata uri
						operatorList.set(operatorAddress, {
							metadata: operatorMetadata,
							createdAtBlock: existingRecord.createdAtBlock,
							updatedAtBlock: blockNumber,
							createdAt: existingRecord.createdAt,
							updatedAt: timestamp
						})
					} else {
						// Operator not registered, valid metadata uri
						operatorList.set(operatorAddress, {
							metadata: operatorMetadata,
							createdAtBlock: blockNumber,
							updatedAtBlock: blockNumber,
							createdAt: timestamp,
							updatedAt: timestamp
						})
					}
				} else {
					throw new Error('Missing operator metadata')
				}
			} else {
				throw new Error('Invalid operator metadata uri')
			}
		} catch (error) {
			if (!existingRecord) {
				// Operator not registered, invalid metadata uri
				operatorList.set(operatorAddress, {
					metadata: defaultMetadata,
					createdAtBlock: blockNumber,
					updatedAtBlock: blockNumber,
					createdAt: timestamp,
					updatedAt: timestamp
				})
			} // Ignore case where Operator is already registered and is updated with invalid metadata uri
		}
	}
	
	console.log(
		`Operators registered between blocks ${firstBlock} ${lastBlock}: ${logs.length}`
	)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.operator.deleteMany())

		const newOperator: prisma.Operator[] = []

		for (const [
			address,
			{ metadata, createdAtBlock, updatedAtBlock, createdAt, updatedAt }
		] of operatorList) {
			newOperator.push({
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
			prismaClient.operator.createMany({
				data: newOperator,
				skipDuplicates: true
			})
		)
	} else {
		for (const [
			address,
			{ metadata, createdAtBlock, updatedAtBlock, createdAt, updatedAt }
		] of operatorList) {
			dbTransactions.push(
				prismaClient.operator.upsert({
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

	console.log('Seeded operators:', operatorList.size)
}
