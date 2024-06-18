import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	loopThroughBlocks
} from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_validatorRestake'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsValidatorRestaked(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)

		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []
			const logsValidatorRestaked: prisma.EventLogs_ValidatorRestaked[] = []

			const logs = await viemClient.getLogs({
				event: parseAbiItem('event ValidatorRestaked(uint40 validatorIndex)'),
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				if (log.args.validatorIndex) {
					logsValidatorRestaked.push({
						address: log.address,
						transactionHash: log.transactionHash,
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash,
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						validatorIndex: BigInt(log.args.validatorIndex)
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_ValidatorRestaked.createMany({
					data: logsValidatorRestaked,
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
			const seedLength = logsValidatorRestaked.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Validator Restake from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
