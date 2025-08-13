import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	loopThroughBlocks,
	LogsUpdateMetadata
} from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorSetStrategies'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsOperatorSetStrategies(
	toBlock?: bigint,
	fromBlock?: bigint
): Promise<LogsUpdateMetadata> {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	let isUpdated = false
	let updatedCount = 0

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			const dbTransactions: any[] = []
			const logsStrategyAdded: prisma.EventLogs_StrategyAddedToOperatorSet[] = []
			const logsStrategyRemoved: prisma.EventLogs_StrategyRemovedFromOperatorSet[] = []

			// Get logs for both events
			const logs = await viemClient.getLogs({
				address: getEigenContracts().AllocationManager,
				events: [
					parseAbiItem([
						'event StrategyAddedToOperatorSet(OperatorSet operatorSet, address strategy)',
						'struct OperatorSet {address avs;uint32 id;}'
					]),
					parseAbiItem([
						'event StrategyRemovedFromOperatorSet(OperatorSet operatorSet, address strategy)',
						'struct OperatorSet {address avs;uint32 id;}'
					])
				],
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				if (log.eventName === 'StrategyAddedToOperatorSet') {
					logsStrategyAdded.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						avs: String(log.args.operatorSet?.avs),
						operatorSetId: BigInt(log.args.operatorSet?.id || 0),
						strategy: String(log.args.strategy)
					})
				} else if (log.eventName === 'StrategyRemovedFromOperatorSet') {
					logsStrategyRemoved.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						avs: String(log.args.operatorSet?.avs),
						operatorSetId: BigInt(log.args.operatorSet?.id || 0),
						strategy: String(log.args.strategy)
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_StrategyAddedToOperatorSet.createMany({
					data: logsStrategyAdded,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_StrategyRemovedFromOperatorSet.createMany({
					data: logsStrategyRemoved,
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

			const seedLength = logsStrategyAdded.length + logsStrategyRemoved.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Operator Set Strategies from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)

			isUpdated = true
			updatedCount += seedLength
		} catch (error) {
			console.error('Error seeding Operator Set Strategy logs:', error)
		}
	})

	return {
		isUpdated,
		updatedCount
	}
}
