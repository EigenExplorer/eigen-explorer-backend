import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_completedWithdrawals'
const blockSyncKeyLogs = 'lastSyncedBlock_queuedWithdrawals' // Latest sync is with WithdrawalQueued table due to foreign key constraint on withdrawalRoot

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedCompletedWithdrawals(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const prismaClient = getPrismaClient()
	const completedWithdrawalList: prisma.WithdrawalCompleted[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock
		? toBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(
			`[In Sync] [Data] Completed Withdrawal from: ${firstBlock} to: ${lastBlock}`
		)
		return
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_WithdrawalCompleted.findMany({
				where: {
					blockNumber: {
						gt: fromBlock,
						lte: toBlock
					}
				}
			})

			for (const l in logs) {
				const log = logs[l]

				const withdrawalRoot = log.withdrawalRoot

				if (withdrawalRoot) {
					completedWithdrawalList.push({
						withdrawalRoot: withdrawalRoot,
						createdAtBlock: log.blockNumber,
						createdAt: log.blockTime
					})
				}
			}
		},
		10_000n
	)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (completedWithdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.withdrawalCompleted.createMany({
				data: completedWithdrawalList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Completed Withdrawal from: ${firstBlock} to: ${lastBlock} size: ${completedWithdrawalList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
