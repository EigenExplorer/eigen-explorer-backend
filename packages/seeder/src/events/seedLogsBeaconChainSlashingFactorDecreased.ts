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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_beaconChainSlashingFactor'

/**
 * Seeder for `BeaconChainSlashingFactorDecreased` event logs
 *
 * @param toBlock
 * @param fromBlock
 */
export async function seedLogsBeaconChainSlashingFactor(toBlock?: bigint, fromBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through EVM logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			const dbTransactions: any[] = []

			const logsBeaconChainSlashingFactor: prisma.EventLogs_BeaconChainSlashingFactorDecreased[] =
				[]

			const logs = await viemClient.getLogs({
				address: getEigenContracts().EigenPodManager,
				event: parseAbiItem([
					'event BeaconChainSlashingFactorDecreased(address staker, uint64 prevBeaconChainSlashingFactor, uint64 newBeaconChainSlashingFactor)'
				]),
				fromBlock,
				toBlock
			})

			// Store event data in array
			for (const log of logs) {
				logsBeaconChainSlashingFactor.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),
					staker: String(log.args.staker),
					prevBeaconChainSlashingFactor: BigInt(log.args.prevBeaconChainSlashingFactor || 0),
					newBeaconChainSlashingFactor: BigInt(log.args.newBeaconChainSlashingFactor || 0)
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_BeaconChainSlashingFactorDecreased.createMany({
					data: logsBeaconChainSlashingFactor,
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
			const seedLength = logsBeaconChainSlashingFactor.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Beacon Chain Slashing Factor Decreased from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {
			console.error('Error seeding BeaconChainSlashingFactorDecreased logs:', error)
		}
	})
}
