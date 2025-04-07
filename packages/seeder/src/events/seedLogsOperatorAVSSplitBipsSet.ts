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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorAVSSplit'

/**
 * Utility function to OperatorAVSSplitBipsSet event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsOperatorAVSSplitBipsSet(
	toBlock?: bigint,
	fromBlock?: bigint
): Promise<LogsUpdateMetadata> {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	let isUpdated = false
	let updatedCount = 0

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)
		try {
			const dbTransactions: any[] = []
			const logsOperatorAVSSplit: prisma.EventLogs_OperatorAVSSplitBipsSet[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().RewardsCoordinator,
				events: [
					parseAbiItem([
						'event OperatorAVSSplitBipsSet(address indexed caller, address indexed operator, address indexed avs, uint32 activatedAt, uint16 oldOperatorAVSSplitBips, uint16 newOperatorAVSSplitBips)'
					])
				],
				fromBlock,
				toBlock
			})

			for (const l in logs) {
				const log = logs[l]

				logsOperatorAVSSplit.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),

					caller: String(log.args.caller),
					operator: String(log.args.operator),
					avs: String(log.args.avs),
					activatedAt: BigInt(log.args.activatedAt || 0),
					oldOperatorAVSSplitBips: Number(log.args.oldOperatorAVSSplitBips),
					newOperatorAVSSplitBips: Number(log.args.newOperatorAVSSplitBips)
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorAVSSplitBipsSet.createMany({
					data: logsOperatorAVSSplit,
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
			const seedLength = logsOperatorAVSSplit.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Operator AVS Split from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)

			isUpdated = true
			updatedCount += seedLength
		} catch {}
	})

	return {
		isUpdated,
		updatedCount
	}
}
