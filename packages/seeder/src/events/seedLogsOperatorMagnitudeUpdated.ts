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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorMagnitude'

/**
 * Utility function to seed event logs for magnitude updates
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsOperatorMagnitudeUpdated(toBlock?: bigint, fromBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			const dbTransactions: any[] = []
			const logsMaxMagnitudeUpdated: prisma.EventLogs_MaxMagnitudeUpdated[] = []
			const logsEncumberedMagnitudeUpdated: prisma.EventLogs_EncumberedMagnitudeUpdated[] = []

			// Get logs for both events
			const logs = await viemClient.getLogs({
				address: getEigenContracts().AllocationManager,
				events: [
					parseAbiItem(
						'event MaxMagnitudeUpdated(address operator, address strategy, uint64 maxMagnitude)'
					),
					parseAbiItem(
						'event EncumberedMagnitudeUpdated(address operator, address strategy, uint64 encumberedMagnitude)'
					)
				],
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				if (log.eventName === 'MaxMagnitudeUpdated') {
					logsMaxMagnitudeUpdated.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						operator: String(log.args.operator),
						strategy: String(log.args.strategy),
						maxMagnitude: String(log.args.maxMagnitude)
					})
				} else if (log.eventName === 'EncumberedMagnitudeUpdated') {
					logsEncumberedMagnitudeUpdated.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						operator: String(log.args.operator),
						strategy: String(log.args.strategy),
						encumberedMagnitude: String(log.args.encumberedMagnitude)
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_MaxMagnitudeUpdated.createMany({
					data: logsMaxMagnitudeUpdated,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_EncumberedMagnitudeUpdated.createMany({
					data: logsEncumberedMagnitudeUpdated,
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

			const seedLength = logsMaxMagnitudeUpdated.length + logsEncumberedMagnitudeUpdated.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Magnitude Updated from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {
			console.error('Error seeding Magnitude logs:', error)
		}
	})
}
