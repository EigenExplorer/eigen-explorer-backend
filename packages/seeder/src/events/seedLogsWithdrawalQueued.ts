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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_queuedWithdrawals'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsWithdrawalQueued(toBlock?: bigint, fromBlock?: bigint) {
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

			const logsWithdrawalQueued: prisma.EventLogs_WithdrawalQueued[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().DelegationManager,
				event: parseAbiItem([
					'event WithdrawalQueued(bytes32 withdrawalRoot, Withdrawal withdrawal)',
					'struct Withdrawal { address staker; address delegatedTo; address withdrawer; uint256 nonce; uint32 startBlock; address[] strategies; uint256[] shares; }'
				]),
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				logsWithdrawalQueued.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),
					withdrawalRoot: String(log.args.withdrawalRoot),
					staker: String(log.args.withdrawal?.staker),
					delegatedTo: String(log.args.withdrawal?.delegatedTo),
					withdrawer: String(log.args.withdrawal?.withdrawer),
					nonce: log.args.withdrawal?.nonce || 0n,
					startBlock: BigInt(log.args.withdrawal?.startBlock || 0),
					strategies: (log.args.withdrawal?.strategies as string[]) || [],
					shares: log.args.withdrawal?.shares.map((s) => s.toString()) || []
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_WithdrawalQueued.createMany({
					data: logsWithdrawalQueued,
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
			const seedLength = logsWithdrawalQueued.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Withdrawal Queued from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {}
	})
}
