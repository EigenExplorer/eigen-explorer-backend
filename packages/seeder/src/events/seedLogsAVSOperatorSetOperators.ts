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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_avsOperatorSetOperators'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsAVSOperatorSetOperators(toBlock?: bigint, fromBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			const dbTransactions: any[] = []
			const logsOperatorSetAdded: prisma.EventLogs_OperatorAddedToOperatorSet[] = []
			const logsOperatorSetRemoved: prisma.EventLogs_OperatorRemovedFromOperatorSet[] = []

			// Get logs for both events
			const logs = await viemClient.getLogs({
				address: getEigenContracts().AllocationManager,
				events: [
					parseAbiItem([
						'event OperatorAddedToOperatorSet(address indexed operator, OperatorSet operatorSet)',
						'struct OperatorSet {address avs;uint32 id;}'
					]),
					parseAbiItem([
						'event OperatorRemovedFromOperatorSet(address indexed operator, OperatorSet operatorSet)',
						'struct OperatorSet {address avs;uint32 id;}'
					])
				],
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				if (log.eventName === 'OperatorAddedToOperatorSet') {
					logsOperatorSetAdded.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						operator: String(log.args.operator),
						avs: String(log.args.operatorSet?.avs),
						operatorSetId: BigInt(log.args.operatorSet?.id || 0)
					})
				} else if (log.eventName === 'OperatorRemovedFromOperatorSet') {
					logsOperatorSetRemoved.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						operator: String(log.args.operator),
						avs: String(log.args.operatorSet?.avs),
						operatorSetId: BigInt(log.args.operatorSet?.id || 0)
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorAddedToOperatorSet.createMany({
					data: logsOperatorSetAdded,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_OperatorRemovedFromOperatorSet.createMany({
					data: logsOperatorSetRemoved,
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

			const seedLength = logsOperatorSetAdded.length + logsOperatorSetRemoved.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] AVS Operator Set Operators from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
