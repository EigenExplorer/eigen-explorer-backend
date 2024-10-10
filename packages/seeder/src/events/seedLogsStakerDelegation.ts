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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_stakers'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsStakerDelegation(toBlock?: bigint, fromBlock?: bigint) {
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

			const logsStakerDelegated: prisma.EventLogs_StakerDelegated[] = []
			const logsStakerUndelegated: prisma.EventLogs_StakerUndelegated[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().DelegationManager,
				events: [
					parseAbiItem('event StakerDelegated(address indexed staker, address indexed operator)'),
					parseAbiItem('event StakerUndelegated(address indexed staker, address indexed operator)')
				],
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				if (log.eventName === 'StakerDelegated') {
					logsStakerDelegated.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						staker: String(log.args.staker),
						operator: String(log.args.operator)
					})
				} else if (log.eventName === 'StakerUndelegated') {
					logsStakerUndelegated.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						staker: String(log.args.staker),
						operator: String(log.args.operator)
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_StakerDelegated.createMany({
					data: logsStakerDelegated,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_StakerUndelegated.createMany({
					data: logsStakerUndelegated,
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
			const seedLength = logsStakerDelegated.length + logsStakerUndelegated.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Staker Delegation from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
