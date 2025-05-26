import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from '../utils/seeder'
import { getViemClient } from '../utils/viemClient'

const blockSyncKey = 'lastSyncedBlock_operatorPiSplit'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorPiSplit'

export async function monitorOperatorPiSplit(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const operatorPiSplitList: { address: string; piSplitBips: number }[] = []

	const currentBlockTimestamp = (await getViemClient().getBlock()).timestamp

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Operator PI Split from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	let maxProcessedBlock = firstBlock

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await prismaClient.eventLogs_OperatorPISplitBipsSet.findMany({
			where: {
				blockNumber: { gt: fromBlock, lte: toBlock }
			}
		})

		for (const log of logs) {
			const blockNumber = BigInt(log.blockNumber)
			const activatedAt = log.activatedAt

			if (activatedAt <= currentBlockTimestamp) {
				operatorPiSplitList.push({
					address: log.operator.toLowerCase(),
					piSplitBips: log.newOperatorPISplitBips
				})
				maxProcessedBlock = blockNumber > maxProcessedBlock ? blockNumber : maxProcessedBlock
			}
		}
	})

	const dbTransactions: any[] = []

	if (operatorPiSplitList.length > 0) {
		const query = `
			UPDATE "Operator" AS o
			SET "piSplitBips" = o2."piSplitBips"
			FROM (
				VALUES ${operatorPiSplitList.map((d) => `('${d.address}', ${d.piSplitBips})`).join(', ')}
			) AS o2 (address, "piSplitBips")
			WHERE o2.address = o.address;
		`
		dbTransactions.push(prismaClient.$executeRaw`${Prisma.raw(query)}`)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Operator PI Split from: ${firstBlock} to: ${maxProcessedBlock} size: ${operatorPiSplitList.length}`
	)

	await saveLastSyncBlock(blockSyncKey, maxProcessedBlock)
}
