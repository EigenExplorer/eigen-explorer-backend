import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avsRegistrar'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_avsRegistrar'

export async function seedAvsRegistrar(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	const avs = await prismaClient.avs.findMany({
		select: { address: true }
	})
	const existingAvs = new Set(avs.map((a) => a.address.toLowerCase()))

	const firstBlock = fromBlock ?? (await fetchLastSyncBlock(blockSyncKey))
	const lastBlock = toBlock ?? (await fetchLastSyncBlock(blockSyncKeyLogs))

	if (lastBlock - firstBlock <= 0n) {
		console.log(`[In Sync] [Data] AVS Registrar from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const avsRegistrarUpdates = new Map<string, { registrar: string }>()

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_AVSRegistrarSet.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})

			// Process each log.
			for (const log of logs) {
				const avsAddress = String(log.avs).toLowerCase()
				const registrar = String(log.registrar).toLowerCase()

				if (existingAvs.has(avsAddress)) {
					avsRegistrarUpdates.set(avsAddress, {
						registrar
					})
				}
			}
		},
		10_000n
	)

	// Prepare DB transactions to update the AVS records.
	const dbTransactions: any[] = []
	for (const [avsAddress, update] of avsRegistrarUpdates) {
		dbTransactions.push(
			prismaClient.avs.update({
				where: { address: avsAddress },
				data: { avsRegistrarAddress: update.registrar }
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] AVS Registrar from: ${firstBlock} to: ${lastBlock} size: ${avsRegistrarUpdates.size}`
	)

	// Store the last synced block number.
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
