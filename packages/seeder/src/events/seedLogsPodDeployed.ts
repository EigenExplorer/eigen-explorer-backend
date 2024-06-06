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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_pods'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsPodDeployed(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()
	const blockData = await getBlockDataFromDb(firstBlock, lastBlock)

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			const logsPodDeployed: prisma.EventLogs_PodDeployed[] = []

			const logs = await viemClient.getLogs({
				address: [getEigenContracts().EigenPodManager],
				events: [
					parseAbiItem(
						'event PodDeployed(address indexed eigenPod, address indexed podOwner)'
					)
				],
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				logsPodDeployed.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.transactionIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),
					eigenPod: String(log.args.eigenPod),
					podOwner: String(log.args.podOwner)
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_PodDeployed.createMany({
					data: logsPodDeployed,
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
			const seedLength = logsPodDeployed.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Pod Deployed from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
