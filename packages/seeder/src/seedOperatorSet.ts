import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operatorSet'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorSet'

export async function seedOperatorSet(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const operatorSetList: prisma.OperatorSet[] = []
	const avsList: {
		address: string
		metadataName: string
		metadataDescription: string
		restakeableStrategies: string[]
		isMetadataSynced: boolean
		totalStakers: number
		totalOperators: number
		createdAtBlock: bigint
		updatedAtBlock: bigint
		createdAt: Date
		updatedAt: Date
	}[] = []

	const existingAvs = await prismaClient.avs.findMany({
		select: { address: true }
	})
	const existingAvsSet = new Set(existingAvs.map((avs) => avs.address.toLowerCase()))

	const firstBlock = fromBlock ?? (await fetchLastSyncBlock(blockSyncKey))
	const lastBlock = toBlock ?? (await fetchLastSyncBlock(blockSyncKeyLogs))

	if (lastBlock - firstBlock <= 0n) {
		console.log(`[In Sync] [Data] OperatorSet from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_OperatorSetCreated.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})

			for (const log of logs) {
				const avsAddress = log.avs.toLowerCase()
				const blockNumber = BigInt(log.blockNumber)
				const createdAt = log.blockTime

				// If AVS does not exist, create it with required fields
				if (!existingAvsSet.has(avsAddress)) {
					avsList.push({
						address: avsAddress,
						metadataName: '',
						metadataDescription: '',
						restakeableStrategies: [],
						isMetadataSynced: false,
						totalStakers: 0,
						totalOperators: 0,
						createdAtBlock: blockNumber,
						updatedAtBlock: blockNumber,
						createdAt,
						updatedAt: createdAt
					})
					existingAvsSet.add(avsAddress)
				}

				operatorSetList.push({
					avsAddress,
					operatorSetId: BigInt(log.operatorSetId),
					strategies: [],
					createdAtBlock: blockNumber,
					updatedAtBlock: blockNumber,
					createdAt,
					updatedAt: createdAt
				})
			}
		},
		10_000n
	)

	// Insert AVS records first to prevent foreign key constraint issues
	const dbTransactions: any[] = []
	if (avsList.length > 0) {
		dbTransactions.push(
			prismaClient.avs.createMany({
				data: avsList,
				skipDuplicates: true
			})
		)
	}

	if (operatorSetList.length > 0) {
		dbTransactions.push(
			prismaClient.operatorSet.createMany({
				data: operatorSetList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] AVS: ${avsList.length}, OperatorSet: ${operatorSetList.length}, Blocks: ${firstBlock} → ${lastBlock}`
	)
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
