import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operatorSlashed'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorSlashed'

export async function seedOperatorSlashed(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	const existingSets = await prismaClient.operatorSet.findMany({
		select: { avsAddress: true, operatorSetId: true }
	})
	const existingSetKeys = new Set(
		existingSets.map((os) => `${os.avsAddress.toLowerCase()}-${os.operatorSetId}`)
	)

	const firstBlock = fromBlock ?? (await fetchLastSyncBlock(blockSyncKey))
	const lastBlock = toBlock ?? (await fetchLastSyncBlock(blockSyncKeyLogs))

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0n) {
		console.log(`[In Sync] [Data] Operator Slashed from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const slashedList: Omit<prisma.AvsOperatorSlashed, 'id'>[] = []

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_OperatorSlashed.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})

			for (const log of logs) {
				const key = `${log.avs.toLowerCase()}-${Number(log.operatorSetId)}`
				if (existingSetKeys.has(key)) {
					slashedList.push({
						operatorAddress: log.operator.toLowerCase(),
						avsAddress: log.avs.toLowerCase(),
						operatorSetId: BigInt(log.operatorSetId),

						strategies: log.strategies.map((s: string) => s.toLowerCase()),
						wadSlashed: log.wadSlashed.map((ws) => ws.toString()),
						description: log.description,

						createdAtBlock: BigInt(log.blockNumber),
						updatedAtBlock: BigInt(log.blockNumber),
						createdAt: log.blockTime,
						updatedAt: log.blockTime
					})
				}
			}
		},
		10_000n
	)

	const dbTransactions: any[] = []
	if (slashedList.length > 0) {
		dbTransactions.push(
			prismaClient.avsOperatorSlashed.createMany({
				data: slashedList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Operator Slashed from: ${firstBlock} to: ${lastBlock}, size: ${slashedList.length}`
	)

	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
