import type prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_pods'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_pods'

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedPods(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const podList: prisma.Pod[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock
		? toBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Pods from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const logs = await prismaClient.eventLogs_PodDeployed.findMany({
		where: {
			blockNumber: {
				gt: firstBlock,
				lte: lastBlock
			}
		}
	})

	for (const l in logs) {
		const log = logs[l]

		const podAddress = String(log.eigenPod).toLowerCase()
		const podOwner = String(log.podOwner).toLowerCase()

		const blockNumber = BigInt(log.blockNumber)
		const timestamp = log.blockTime

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

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Pods from: ${firstBlock} to: ${lastBlock} size: ${podList.length}`
	)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
