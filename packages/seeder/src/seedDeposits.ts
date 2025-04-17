import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_deposit'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_deposit'

export async function seedDeposits(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const depositList: Omit<prisma.Deposit, 'id'>[] = []

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Deposit from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await prismaClient.eventLogs_Deposit.findMany({
			where: {
				blockNumber: {
					gt: fromBlock,
					lte: toBlock
				}
			}
		})

		for (const l in logs) {
			const log = logs[l]

			const blockNumber = BigInt(log.blockNumber)
			const timestamp = log.blockTime

			depositList.push({
				transactionHash: log.transactionHash.toLowerCase(),
				stakerAddress: log.staker.toLowerCase(),
				tokenAddress: log.token.toLowerCase(),
				strategyAddress: log.strategy.toLowerCase(),
				shares: log.shares,
				createdAtBlock: blockNumber,
				createdAt: timestamp
			})
		}
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (depositList.length > 0) {
		dbTransactions.push(
			prismaClient.deposit.createMany({
				data: depositList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Deposit from: ${firstBlock} to: ${lastBlock} size: ${depositList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
