import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_redistributionAddress'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_redistributionAddress'

export async function seedOperatorSetRedistributionAddress(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	const operatorSet = await prismaClient.operatorSet.findMany({
		select: {
			avsAddress: true,
			operatorSetId: true
		}
	})
	const existingSets = new Set(
		operatorSet.map((os) => `${os.avsAddress.toLowerCase()}-${os.operatorSetId}`)
	)

	const firstBlock = fromBlock ?? (await fetchLastSyncBlock(blockSyncKey))
	const lastBlock = toBlock ?? (await fetchLastSyncBlock(blockSyncKeyLogs))
	if (lastBlock - firstBlock <= 0n) {
		console.log(`[In Sync] [Data] Redistribution Address from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const redistributionRecipientUpdates = new Map<string, string>()
	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_RedistributionAddressSet.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})

			for (const log of logs) {
				const key = `${log.avs.toLowerCase()}-${log.operatorSetId}`
				if (existingSets.has(key))
					redistributionRecipientUpdates.set(key, log.redistributionRecipient.toLowerCase())
			}
		},
		10_000n
	)

	const dbTransactions: any[] = []
	for (const [operatorSet, redistributionRecipient] of redistributionRecipientUpdates) {
		const [avsAddress, operatorSetIdStr] = operatorSet.split('-')
		const operatorSetId = BigInt(operatorSetIdStr)
		dbTransactions.push(
			prismaClient.operatorSet.update({
				where: {
					avsAddress_operatorSetId: {
						avsAddress,
						operatorSetId
					}
				},
				data: { redistributionRecipient }
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Redistribution Address from: ${firstBlock} to: ${lastBlock} size: ${redistributionRecipientUpdates.size}`
	)

	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
