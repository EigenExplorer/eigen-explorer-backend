import prisma from '@prisma/client';
import { parseAbiItem } from 'viem'
import { getPrismaClient } from '../utils/prismaClient'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	loopThroughBlocks
} from '../utils/seeder'

const blockSyncKeyLogs =
	'lastSyncedBlock_logs_avs_{address}_registryCoordinator'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsAVSRegistryCoordinator(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const avsList = await prismaClient.avs.findMany({
		where: { registryCoordinatorAddress: { not: null } },
		select: { address: true, registryCoordinatorAddress: true }
	})

	for (const avs of avsList) {
		const logKey = blockSyncKeyLogs.replace('{address}', avs.address)

		const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(logKey)
		const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

		// Loop through evm logs
		await loopThroughBlocks(
			firstBlock,
			lastBlock,
			async (fromBlock, toBlock) => {
				const blockData = await getBlockDataFromDb(fromBlock, toBlock)

				try {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					const dbTransactions: any[] = []
					const logsOperatorRegistered: prisma.EventLogs_OperatorRegistered[] =
					[];
					const logsOperatorDeregistered: prisma.EventLogs_OperatorDeregistered[] =
					[];

					const logs = await viemClient.getLogs({
						address: avs.registryCoordinatorAddress as `0x${string}`,
						events: [
							parseAbiItem(
								'event OperatorRegistered(address indexed operator, bytes32 indexed operatorId)'
							),
							parseAbiItem(
								'event OperatorDeregistered(address indexed operator, bytes32 indexed operatorId)'
							)
						],
						fromBlock,
						toBlock
					})

					// Setup a list containing event data
					for (const l in logs) {
						const log = logs[l];
			
						if (log.eventName == "OperatorRegistered") {
							logsOperatorRegistered.push({
								address: log.address,
								transactionHash: log.transactionHash,
								transactionIndex: log.logIndex,
								blockNumber: BigInt(log.blockNumber),
								blockHash: log.blockHash,
								blockTime: blockData.get(log.blockNumber) || new Date(0),
								operator: String(log.args.operator),
								operatorId: String(log.args.operatorId)
							})
						} else if (log.eventName == "OperatorDeregistered") {
								logsOperatorDeregistered.push({
								address: log.address,
								transactionHash: log.transactionHash,
								transactionIndex: log.logIndex,
								blockNumber: BigInt(log.blockNumber),
								blockHash: log.blockHash,
								blockTime: blockData.get(log.blockNumber) || new Date(0),
								operator: String(log.args.operator),
								operatorId: String(log.args.operatorId)
							})
						}
					}
			
					dbTransactions.push(
						prismaClient.eventLogs_OperatorRegistered.createMany({
							data: logsOperatorRegistered,
							skipDuplicates: true,
						})
					)
		
					dbTransactions.push(
						prismaClient.eventLogs_OperatorDeregistered.createMany({
							data: logsOperatorDeregistered,
							skipDuplicates: true,
						})
					)

					// Store last synced block
					dbTransactions.push(
						prismaClient.settings.upsert({
							where: { key: logKey },
							update: { value: Number(toBlock) },
							create: { key: logKey, value: Number(toBlock) }
						})
					)

					await bulkUpdateDbTransactions(
						dbTransactions,
						`[Logs] AVS Registry Coordinator addr: ${avs.address} from: ${fromBlock} to: ${toBlock} size: ${logs.length}`
					)
				} catch (error) {}
			}
		)
	}
}
