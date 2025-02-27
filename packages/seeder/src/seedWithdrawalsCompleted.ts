import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_completedWithdrawals'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_completedWithdrawals'

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedCompletedWithdrawals(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const completedWithdrawalList: prisma.WithdrawalCompleted[] = []

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Completed Withdrawal from: ${firstBlock} to: ${lastBlock}`)
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

			const depositLogs = await prismaClient.eventLogs_Deposit.findMany({
				where: {
					blockNumber: {
						gt: fromBlock,
						lte: toBlock
					}
				}
			})

			const podSharesUpdatedLogs = await prismaClient.eventLogs_PodSharesUpdated.findMany({
				where: {
					blockNumber: {
						gt: fromBlock,
						lte: toBlock
					}
				}
			})

			for (const l in logs) {
				const log = logs[l]

				const transactionHash = log.transactionHash.toLowerCase()
				const transactionIndex = log.transactionIndex
				const withdrawalRoot = log.withdrawalRoot

				if (withdrawalRoot) {
					let receiveAsTokens = true

					if (
						depositLogs.find(
							(dLog) =>
								dLog.transactionHash.toLowerCase() === transactionHash &&
								(dLog.transactionIndex === transactionIndex - 1 ||
									dLog.transactionIndex === transactionIndex - 2)
						)
					) {
						receiveAsTokens = false
					} else if (
						podSharesUpdatedLogs.find(
							(pLog) =>
								pLog.transactionHash.toLowerCase() === transactionHash &&
								(pLog.transactionIndex === transactionIndex - 1 ||
									pLog.transactionIndex === transactionIndex - 2)
						)
					) {
						receiveAsTokens = false
					}
					completedWithdrawalList.push({
						withdrawalRoot: withdrawalRoot,
						receiveAsTokens: receiveAsTokens,
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
