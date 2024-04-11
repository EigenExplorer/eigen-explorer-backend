import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../viem/viemClient'
import { getPrismaClient } from '../prisma/prismaClient'

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedPods(fromBlock: bigint, toBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const podList: { address: string; owner: string; blockNumber: bigint }[] = []

	console.log('Seeding Pods ...')

	// Seed avs from event logs
	const latestBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	let currentBlock = fromBlock
	let nextBlock = fromBlock

	while (nextBlock < latestBlock) {
		nextBlock = currentBlock + 9999n
		if (nextBlock >= latestBlock) nextBlock = latestBlock

		const logs = await viemClient.getLogs({
			address: getEigenContracts().EigenPodManager,
			event: parseAbiItem(
				'event PodDeployed(address indexed eigenPod, address indexed podOwner)'
			),
			fromBlock: currentBlock,
			toBlock: nextBlock
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
			`Pods deployed between blocks ${currentBlock} ${nextBlock}: ${logs.length}`
		)

		currentBlock = nextBlock
	}

	// Create
	await prismaClient.pod.createMany({
		data: podList
	})

	console.log('Seeded Pods:', podList.length)
}
