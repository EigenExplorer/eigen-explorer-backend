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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_podShares'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsPodSharesUpdated(
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
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []
			const logsPodSharesUpdated: prisma.EventLogs_PodSharesUpdated[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().EigenPodManager,
				event: parseAbiItem('event PodSharesUpdated(address indexed podOwner, int256 sharesDelta)'),
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				logsPodSharesUpdated.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),
					podOwner: String(log.args.podOwner),
					sharesDelta: String(log.args.sharesDelta)
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_PodSharesUpdated.createMany({
					data: logsPodSharesUpdated,
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
			const seedLength = logsPodSharesUpdated.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Pod Shares Updated from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)

			isUpdated = true
			updatedCount += seedLength
		} catch (error) {}
	})

	return {
		isUpdated,
		updatedCount
	}
}
