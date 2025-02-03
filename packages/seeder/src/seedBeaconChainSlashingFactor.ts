import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_beaconChainSlashingFactor'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_beaconChainSlashingFactor'

export async function seedBeaconChainSlashingFactor(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no new data
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] BeaconChainSlashingFactor from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const slashingFactorUpdates =
				await prismaClient.eventLogs_BeaconChainSlashingFactorDecreased.findMany({
					where: {
						blockNumber: {
							gt: fromBlock,
							lte: toBlock
						}
					},
					orderBy: { blockNumber: 'asc' }
				})

			// Prepare db transaction object
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			for (const update of slashingFactorUpdates) {
				// Find the Pod associated with this staker (since staker is Pod owner)
				const pod = await prismaClient.pod.findFirst({
					where: { owner: update.staker.toLowerCase() },
					select: { address: true }
				})

				// If a pod is found, update its beaconChainSlashingFactor
				if (pod) {
					dbTransactions.push(
						prismaClient.pod.update({
							where: { address: pod.address },
							data: { beaconChainSlashingFactor: update.newBeaconChainSlashingFactor }
						})
					)
				}
			}

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Data] BeaconChainSlashingFactor from: ${fromBlock} to: ${toBlock} size: ${slashingFactorUpdates.length}`
			)
		},
		10_000n
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
