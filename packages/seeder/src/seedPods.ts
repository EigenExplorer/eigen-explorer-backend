import prisma from '@prisma/client'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
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
	const podList: prisma.Pod[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	const logs = await prismaClient.eventLogs_PodDeployed.findMany({
		where: {
			blockNumber: {
				gte: fromBlock,
				lte: toBlock
			}
		}
	})

	for (const l in logs) {
		const log = logs[l]

		const podAddress = String(log.eigenPod).toLowerCase()
		const podOwner = String(log.podOwner).toLowerCase()

		const blockNumber = BigInt(log.blockNumber)
		const timestamp = new Date(Number(log.blockTime) * 1000)

		podList.push({
			address: podAddress,
			owner: podOwner,
			blockNumber,
			createdAtBlock: blockNumber,
			updatedAtBlock: blockNumber,
			createdAt: timestamp,
			updatedAt: timestamp
		})
	}

	console.log(
		`Pods deployed between blocks ${fromBlock} ${toBlock}: ${logs.length}`
	)

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
						blockNumber: pod.blockNumber,
						updatedAtBlock: pod.updatedAtBlock,
						updatedAt: pod.updatedAt
					},
					create: {
						address: pod.address,
						owner: pod.owner,
						blockNumber: pod.blockNumber,
						createdAtBlock: pod.createdAtBlock,
						createdAt: pod.createdAt,
						updatedAtBlock: pod.updatedAtBlock,
						updatedAt: pod.updatedAt
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
