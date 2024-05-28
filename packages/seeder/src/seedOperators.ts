import type prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import { parseAbiItem } from 'viem'
import {
	type EntityMetadata,
	defaultMetadata,
	isValidMetadataUrl,
	validateMetadata
} from './utils/metadata'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock,
	fetchWithTimeout
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operators'

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
	console.log('Seeding Operators ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const operatorList: Map<string, OperatorEntryRecord> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().DelegationManager,
			event: parseAbiItem(
				'event OperatorMetadataURIUpdated(address indexed operator, string metadataURI)'
			),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const operatorAddress = String(log.args.operator).toLowerCase()
			const existingRecord = operatorList.get(operatorAddress)
			const metadataUrl = log.args.metadataURI

			const blockNumber = BigInt(log.blockNumber)
			const block = await viemClient.getBlock({ blockNumber: blockNumber })
			const timestamp = new Date(Number(block.timestamp) * 1000)

			try {
				if (metadataUrl && isValidMetadataUrl(metadataUrl)) {
					const response = await fetchWithTimeout(metadataUrl)
					const data = response ? await response.text() : ''
					const operatorMetadata = validateMetadata(data)

					if (operatorMetadata) {
						if (existingRecord) {
							// Operator already registered, valid metadata uri
							operatorList.set(operatorAddress, {
								metadataUrl: metadataUrl,
								metadata: operatorMetadata,
								isMetadataSynced: true,
								createdAtBlock: existingRecord.createdAtBlock,
								updatedAtBlock: blockNumber,
								createdAt: existingRecord.createdAt,
								updatedAt: timestamp
							})
						} else {
							// Operator not registered, valid metadata uri
							operatorList.set(operatorAddress, {
								metadataUrl: metadataUrl,
								metadata: operatorMetadata,
								isMetadataSynced: true,
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
						metadataUrl: metadataUrl ? metadataUrl : '',
						metadata: defaultMetadata,
						isMetadataSynced: false,
						createdAtBlock: blockNumber,
						updatedAtBlock: blockNumber,
						createdAt: timestamp,
						updatedAt: timestamp
					})
				} else {
					// Ignore case where Operator is already registered and is updated with invalid metadata uri
					operatorList.set(operatorAddress, {
						metadataUrl: metadataUrl ? metadataUrl : '',
						metadata: existingRecord.metadata,
						isMetadataSynced: false,
						createdAtBlock: existingRecord.createdAtBlock,
						updatedAtBlock: blockNumber,
						createdAt: existingRecord.createdAt,
						updatedAt: timestamp
					})
				}
			}
		}

		console.log(
			`Operators registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
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
				metadataUrl: metadataUrl,
				metadataName: metadata.name,
				metadataDescription: metadata.description,
				metadataLogo: metadata.logo,
				metadataDiscord: metadata.discord,
				metadataTelegram: metadata.telegram,
				metadataWebsite: metadata.website,
				metadataX: metadata.x,
				isMetadataSynced: isMetadataSynced,
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
						metadataUrl: metadataUrl,
						metadataName: metadata.name,
						metadataDescription: metadata.description,
						metadataLogo: metadata.logo,
						metadataDiscord: metadata.discord,
						metadataTelegram: metadata.telegram,
						metadataWebsite: metadata.website,
						metadataX: metadata.x,
						isMetadataSynced: isMetadataSynced,
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
						isMetadataSynced: isMetadataSynced,
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

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded operators:', operatorList.size)
}
