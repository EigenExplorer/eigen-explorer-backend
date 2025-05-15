import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	LogsUpdateMetadata,
	loopThroughBlocks
} from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_avs'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsAVSMetadata(
	toBlock?: bigint,
	fromBlock?: bigint
): Promise<LogsUpdateMetadata> {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	const contracts = [getEigenContracts().AVSDirectory, getEigenContracts().AllocationManager]
	let isUpdated = false
	let updatedCount = 0

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []
			const logsAVSMetadataURIUpdated: prisma.EventLogs_AVSMetadataURIUpdated[] = []

			for (const contract of contracts) {
				const logs = await viemClient.getLogs({
					address: contract,
					event: parseAbiItem(
						'event AVSMetadataURIUpdated(address indexed avs, string metadataURI)'
					),
					fromBlock,
					toBlock
				})

				// Setup a list containing event data
				for (const l in logs) {
					const log = logs[l]

					logsAVSMetadataURIUpdated.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						avs: String(log.args.avs),
						metadataURI: String(log.args.metadataURI)
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_AVSMetadataURIUpdated.createMany({
					data: logsAVSMetadataURIUpdated,
					skipDuplicates: true
				})
			)

			// Store last synced block
			dbTransactions.push(
				prismaClient.settings.upsert({
					where: { key: blockSyncKeyLogs },
					update: { value: Number(toBlock) },
					create: { key: blockSyncKeyLogs, value: Number(toBlock) }
				})
			)

			// Update database
			const seedLength = logsAVSMetadataURIUpdated.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] AVS Metadata from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)

			isUpdated = true
			updatedCount += seedLength
		} catch (error) {}
	})

	return {
		isUpdated,
		updatedCount
	}
}
