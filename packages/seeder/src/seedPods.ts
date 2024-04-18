import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './viem/viemClient'
import { getPrismaClient } from './prisma/prismaClient'
import {
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_pods'

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedPods(fromBlock?: bigint, toBlock?: bigint) {
	console.log('Seeding Pods ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const podList: { address: string; owner: string; blockNumber: bigint }[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().EigenPodManager,
			event: parseAbiItem(
				'event PodDeployed(address indexed eigenPod, address indexed podOwner)'
			),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const podAddress = String(log.args.eigenPod).toLowerCase()
			const podOwner = String(log.args.podOwner).toLowerCase()

			podList.push({
				address: podAddress,
				owner: podOwner,
				blockNumber: log.blockNumber
			})
		}

		console.log(
			`Pods deployed between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	// Prepare db transaction object
	if (podList.length > 0) {
		await prismaClient.pod.createMany({
			data: podList
		})
	}

	console.log('Seeded Pods:', podList.length)
}
