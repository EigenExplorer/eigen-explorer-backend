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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorSet'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsOperatorSetCreated(toBlock?: bigint, fromBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []
			const logsOperatorSetCreated: prisma.EventLogs_OperatorSetCreated[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().AllocationManager,
				event: parseAbiItem([
					'event OperatorSetCreated(OperatorSet operatorSet)',
					'struct OperatorSet {address avs;uint32 id;}'
				]),
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				logsOperatorSetCreated.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),
					avs: String(log.args.operatorSet?.avs),
					operatorSetId: BigInt(log.args.operatorSet?.id || 0)
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorSetCreated.createMany({
					data: logsOperatorSetCreated,
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
			const seedLength = logsOperatorSetCreated.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Operator Set Created from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
