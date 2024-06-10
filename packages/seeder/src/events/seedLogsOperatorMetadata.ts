import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	loopThroughBlocks
} from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_operators'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsOperatorMetadata(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []
			const logsOperatorMetadataURIUpdated: prisma.EventLogs_OperatorMetadataURIUpdated[] =
				[]

			const logs = await viemClient.getLogs({
				address: getEigenContracts().DelegationManager,
				event: parseAbiItem(
					'event OperatorMetadataURIUpdated(address indexed operator, string metadataURI)'
				),
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				logsOperatorMetadataURIUpdated.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),
					operator: String(log.args.operator),
					metadataURI: String(log.args.metadataURI)
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorMetadataURIUpdated.createMany({
					data: logsOperatorMetadataURIUpdated,
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
			const seedLength = logsOperatorMetadataURIUpdated.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Operator Metadata from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
