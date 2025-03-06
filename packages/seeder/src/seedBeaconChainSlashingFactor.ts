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

	const slashingFactorUpdates = new Map<string, string>()

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await prismaClient.eventLogs_BeaconChainSlashingFactorDecreased.findMany({
			where: {
				blockNumber: { gt: fromBlock, lte: toBlock }
			}
		})

		// Extract unique staker addresses
		const stakerAddresses = [...new Set(logs.map((log) => log.staker.toLowerCase()))]

		const pods = await prismaClient.pod.findMany({
			where: { owner: { in: stakerAddresses } },
			select: { address: true, owner: true }
		})

		// Map of owner addresses to pod addresses
		const podAddressMap = new Map(pods.map((pod) => [pod.owner, pod.address]))

		for (const log of logs) {
			const podAddress = podAddressMap.get(log.staker.toLowerCase())
			if (podAddress) {
				slashingFactorUpdates.set(podAddress, log.newBeaconChainSlashingFactor)
			}
		}
	})

	// Prepare DB transactions
	const dbTransactions: any[] = []
	for (const [podAddress, slashingFactor] of slashingFactorUpdates) {
		dbTransactions.push(
			prismaClient.pod.update({
				where: { address: podAddress },
				data: { beaconChainSlashingFactor: slashingFactor }
			})
		)
	}

	if (dbTransactions.length > 0) {
		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Data] BeaconChainSlashingFactor from: ${firstBlock} to: ${lastBlock} size: ${slashingFactorUpdates.size}`
		)
	}

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
