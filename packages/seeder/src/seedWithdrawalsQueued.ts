import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
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
	const queuedWithdrawalList: prisma.WithdrawalQueued[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock
		? toBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(
			`[In Sync] [Data] Queued Withdrawal from: ${firstBlock} to: ${lastBlock}`
		)
		return
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_WithdrawalQueued.findMany({
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

				const blockNumber = BigInt(log.blockNumber)
				const timestamp = log.blockTime

				if (withdrawalRoot) {
					const stakerAddress = log.staker.toLowerCase()
					const delegatedTo = log.delegatedTo.toLowerCase()
					const withdrawerAddress = log.withdrawer.toLowerCase()

					queuedWithdrawalList.push({
						withdrawalRoot,
						nonce: Number(log.nonce),
						stakerAddress,
						delegatedTo,
						withdrawerAddress,
						strategies: log.strategies.map((s) => s.toLowerCase()) as string[],
						shares: log.shares.map((s) => s.toString()),

						createdAtBlock: blockNumber,
						createdAt: timestamp
					})
				}
			}
		},
		10_000n
	)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (queuedWithdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.withdrawalQueued.createMany({
				data: queuedWithdrawalList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Queued Withdrawal from: ${firstBlock} to: ${lastBlock} size: ${queuedWithdrawalList.length}`
	)

	// // Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}