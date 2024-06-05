import type prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from '../utils/seeder'

const blockSyncKey = 'lastSyncedBlock_blockdata'

export async function seedBlockData(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding Block Data ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const blockList: Map<bigint, Date> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Retrieve blocks in batches and extract timestamps
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		let currentBlock = fromBlock

		while (currentBlock <= toBlock) {
			const lastBlockInBatch = currentBlock + 98n // Batches of 99
			const effectiveLastBlock =
				lastBlockInBatch > toBlock ? toBlock : lastBlockInBatch

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const promises: any[] = []
			for (
				let blockNumber = currentBlock;
				blockNumber <= effectiveLastBlock;
				blockNumber++
			) {
				promises.push(viemClient.getBlock({ blockNumber: blockNumber }))
			}
			const blocks = await Promise.all(promises)
			for (const block of blocks) {
				const timestamp = new Date(Number(block.timestamp) * 1000)
				blockList.set(block.number, timestamp)
			}

			console.log(
				`Retrieved Block Data for ${currentBlock} - ${effectiveLastBlock}`
			)
			currentBlock = effectiveLastBlock + 1n
		}
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	const newBlockData: prisma.Evm_BlockData[] = []

	for (const [number, timestamp] of blockList) {
		newBlockData.push({
			number,
			timestamp
		})
	}

	dbTransactions.push(
		prismaClient.evm_BlockData.createMany({
			data: newBlockData,
			skipDuplicates: true
		})
	)

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded BlockData:', blockList.size)
}
