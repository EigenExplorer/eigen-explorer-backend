import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_completedWithdrawals'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_completedWithdrawals'

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
	const completedWithdrawalList: string[] = []

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

	const logs = await prismaClient.eventLogs_WithdrawalCompleted.findMany({
		where: {
			blockNumber: {
				gt: firstBlock,
				lte: lastBlock
			}
		}
	})

	for (const l in logs) {
		const log = logs[l]

		const withdrawalRoot = log.withdrawalRoot

		if (withdrawalRoot) {
			completedWithdrawalList.push(withdrawalRoot)
		}
	}

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (completedWithdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.withdrawal.updateMany({
				where: { withdrawalRoot: { in: completedWithdrawalList } },
				data: {
					isCompleted: true
				}
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Completed Withdrawal from: ${firstBlock} to: ${lastBlock} size: ${completedWithdrawalList.length}`
	)

	// // Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
