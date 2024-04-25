import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
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
export async function seedPods(toBlock?: bigint, fromBlock?: bigint) {
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

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.validatorRestake.deleteMany())
		dbTransactions.push(prismaClient.pod.deleteMany())

		dbTransactions.push(
			prismaClient.pod.createMany({
				data: podList,
				skipDuplicates: true
			})
		)
	} else {
		podList.map((pod) => {
			dbTransactions.push(
				prismaClient.pod.upsert({
					where: { address: pod.address },
					update: {
						owner: pod.owner,
						blockNumber: pod.blockNumber
					},
					create: {
						address: pod.address,
						owner: pod.owner,
						blockNumber: pod.blockNumber
					}
				})
			)
		})
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded Pods:', podList.length)
}
