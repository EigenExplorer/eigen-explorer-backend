import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	loopThroughBlocks
} from '../utils/seeder'
import { getViemClient } from '../utils/viemClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_strategyWhitelist'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogStrategyWhitelist(toBlock?: bigint, fromBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			const dbTransactions: any[] = []

			const logsStrategyWhitelist: prisma.EventLogs_StrategyAddedToDepositWhitelist[] = []
			const logsStrategyWhitelistRemoved: prisma.EventLogs_StrategyRemovedFromDepositWhitelist[] =
				[]

			const logs = await viemClient.getLogs({
				address: getEigenContracts().StrategyManager,
				events: [
					parseAbiItem('event StrategyAddedToDepositWhitelist(address strategy)'),
					parseAbiItem('event StrategyRemovedFromDepositWhitelist(address strategy)')
				],
				fromBlock,
				toBlock
			})

			for (const l in logs) {
				const log = logs[l]

				if (log.eventName === 'StrategyAddedToDepositWhitelist') {
					logsStrategyWhitelist.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						strategy: String(log.args.strategy)
					})
				} else if (log.eventName === 'StrategyRemovedFromDepositWhitelist') {
					logsStrategyWhitelistRemoved.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						strategy: String(log.args.strategy)
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_StrategyAddedToDepositWhitelist.createMany({
					data: logsStrategyWhitelist,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_StrategyRemovedFromDepositWhitelist.createMany({
					data: logsStrategyWhitelistRemoved,
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

			const seedLength = logsStrategyWhitelist.length + logsStrategyWhitelistRemoved.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Strategy Whitelist from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
