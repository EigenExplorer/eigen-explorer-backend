import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_queuedWithdrawals'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_queuedWithdrawals'

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedQueuedWithdrawals(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const prismaClient = getPrismaClient()
	const queuedWithdrawalList: prisma.Withdrawal[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock
		? toBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`Queued Withdrawals in sync ${firstBlock} - ${lastBlock}`)
		return
	}

	console.log(`Seeding Queued Withdrawals from ${firstBlock} - ${lastBlock}`)

	const logs = await prismaClient.eventLogs_WithdrawalQueued.findMany({
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

		const blockNumber = BigInt(log.blockNumber)
		const timestamp = log.blockTime

		if (withdrawalRoot) {
			const stakerAddress = log.staker.toLowerCase()
			const delegatedTo = log.delegatedTo.toLowerCase()
			const withdrawerAddress = log.withdrawer.toLowerCase()

			queuedWithdrawalList.push({
				withdrawalRoot,
				nonce: Number(log.nonce),
				isCompleted: false,
				stakerAddress,
				delegatedTo,
				withdrawerAddress,
				strategies: log.strategies.map((s) => s.toLowerCase()) as string[],
				shares: log.shares.map((s) => s.toString()),

				startBlock: log.startBlock,
				createdAtBlock: blockNumber,
				updatedAtBlock: blockNumber,
				createdAt: timestamp,
				updatedAt: timestamp
			})
		}
	}

	console.log(
		`Withdrawals queued between blocks ${firstBlock} ${lastBlock}: ${logs.length}`
	)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (queuedWithdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.withdrawal.createMany({
				data: queuedWithdrawalList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// // Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded Queued Withdrawals:', queuedWithdrawalList.length)
}
