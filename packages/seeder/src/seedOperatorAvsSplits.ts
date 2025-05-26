import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operatorAvsSplits'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorAvsSplit'

export async function seedOperatorAvsSplits(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const operatorAvsSplitList: prisma.OperatorAvsSplit[] = []

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Operator AVS Splits from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const existingAvs = await prismaClient.avs.findMany({ select: { address: true } })
	const existingAvsSet = new Set(existingAvs.map((avs) => avs.address.toLowerCase()))
	const existingOperators = await prismaClient.operator.findMany({ select: { address: true } })
	const existingOperatorsSet = new Set(existingOperators.map((op) => op.address.toLowerCase()))

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await prismaClient.eventLogs_OperatorAVSSplitBipsSet.findMany({
			where: {
				blockNumber: {
					gt: fromBlock,
					lte: toBlock
				}
			}
		})

		for (const log of logs) {
			const operatorAddress = log.operator.toLowerCase()
			const avsAddress = log.avs.toLowerCase()

			if (!existingOperatorsSet.has(operatorAddress) || !existingAvsSet.has(avsAddress)) {
				continue
			}

			operatorAvsSplitList.push({
				operatorAddress,
				avsAddress,
				splitBips: log.newOperatorAVSSplitBips,
				activatedAt: log.activatedAt,
				createdAtBlock: BigInt(log.blockNumber),
				createdAt: log.blockTime
			})
		}
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (operatorAvsSplitList.length > 0) {
		dbTransactions.push(
			prismaClient.operatorAvsSplit.createMany({
				data: operatorAvsSplitList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Operator AVS Splits from: ${firstBlock} to: ${lastBlock} size: ${operatorAvsSplitList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
