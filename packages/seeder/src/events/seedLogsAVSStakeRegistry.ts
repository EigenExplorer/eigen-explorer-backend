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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_avs_{address}_stakeRegistry'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsAVSStakeRegistry(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const avsList = await prismaClient.avs.findMany({
		where: { stakeRegistryAddress: { not: null } },
		select: { address: true, stakeRegistryAddress: true }
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
					const logsMinimumStakeForQuorumUpdated: prisma.EventLogs_MinimumStakeForQuorumUpdated[] = [];
					const logsStrategyAddedToQuorum: prisma.EventLogs_StrategyAddedToQuorum[] = [];
					const logsStrategyRemovedFromQuorum: prisma.EventLogs_StrategyRemovedFromQuorum[] = [];
					const logsStrategyMultiplierUpdated: prisma.EventLogs_StrategyMultiplierUpdated[] = [];
					const logs = await viemClient.getLogs({
						address: avs.stakeRegistryAddress as `0x${string}`,
						events: [
							parseAbiItem(
								'event MinimumStakeForQuorumUpdated(uint8 indexed quorumNumber, uint96 minimumStake)'
							),
							parseAbiItem(
								'event StrategyAddedToQuorum(uint8 indexed quorumNumber, address strategy)'
							),
							parseAbiItem(
								'event StrategyRemovedFromQuorum(uint8 indexed quorumNumber, address strategy)'
							),
							parseAbiItem(
								'event StrategyMultiplierUpdated(uint8 indexed quorumNumber, address strategy, uint256 multiplier)'
							)
						],
						fromBlock,
						toBlock
					})

					// Setup a list containing event data
					for (const l in logs) {
						const log = logs[l];
			
						if (log.eventName == "MinimumStakeForQuorumUpdated") {
							logsMinimumStakeForQuorumUpdated.push({
								address: log.address,
								transactionHash: log.transactionHash,
								transactionIndex: log.logIndex,
								blockNumber: BigInt(log.blockNumber),
								blockHash: log.blockHash,
								blockTime: blockData.get(log.blockNumber) || new Date(0),
								quorumNumber: Number(log.args.quorumNumber),
								minimumStake: Number(log.args.minimumStake),
						  	})
						} else if (log.eventName == "StrategyAddedToQuorum") {
							logsStrategyAddedToQuorum.push({
								address: log.address,
								transactionHash: log.transactionHash,
								transactionIndex: log.logIndex,
								blockNumber: BigInt(log.blockNumber),
								blockHash: log.blockHash,
								blockTime: blockData.get(log.blockNumber) || new Date(0),
								quorumNumber: Number(log.args.quorumNumber),
								strategy: String(log.args.strategy),
						 	})
						} else if (log.eventName == "StrategyRemovedFromQuorum") {
							logsStrategyRemovedFromQuorum.push({
								address: log.address,
								transactionHash: log.transactionHash,
								transactionIndex: log.logIndex,
								blockNumber: BigInt(log.blockNumber),
								blockHash: log.blockHash,
								blockTime: blockData.get(log.blockNumber) || new Date(0),
								quorumNumber: Number(log.args.quorumNumber),
								strategy: String(log.args.strategy),
							})
						} else if (log.eventName == "StrategyMultiplierUpdated") {
							logsStrategyMultiplierUpdated.push({
								address: log.address,
								transactionHash: log.transactionHash,
								transactionIndex: log.logIndex,
								blockNumber: BigInt(log.blockNumber),
								blockHash: log.blockHash,
								blockTime: blockData.get(log.blockNumber) || new Date(0),
								quorumNumber: Number(log.args.quorumNumber),
								strategy: String(log.args.strategy),
								multiplier: Number(log.args.multiplier)
							})
						}
					  }
			
					  dbTransactions.push(
						prismaClient.eventLogs_MinimumStakeForQuorumUpdated.createMany({
						  data: logsMinimumStakeForQuorumUpdated,
						  skipDuplicates: true,
						})
					  );
			
					  dbTransactions.push(
						prismaClient.eventLogs_StrategyAddedToQuorum.createMany({
						  data: logsStrategyAddedToQuorum,
						  skipDuplicates: true,
						})
					  );

					  dbTransactions.push(
						prismaClient.eventLogs_StrategyRemovedFromQuorum.createMany({
						  data: logsStrategyRemovedFromQuorum,
						  skipDuplicates: true,
						})
					  );

					  dbTransactions.push(
						prismaClient.eventLogs_StrategyMultiplierUpdated.createMany({
						  data: logsStrategyMultiplierUpdated,
						  skipDuplicates: true,
						})
					  );
					
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
						`[Logs] AVS Stake Registry addr: ${avs.address} from: ${fromBlock} to: ${toBlock} size: ${logs.length}`
					)
				} catch (error) {}
			}
		)
	}
}
