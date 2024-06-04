import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getViemClient } from '../utils/viemClient'
import {
	baseBlock,
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

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		let firstBlock = fromBlock
		while (firstBlock <= toBlock) {
			try {
				const blockNumber = firstBlock
				const block = await viemClient.getBlock({ blockNumber: blockNumber })
				const timestamp = new Date(Number(block.timestamp) * 1000)

				blockList.set(blockNumber, timestamp)

				firstBlock = firstBlock + 1n
			} catch {}
		}
		console.log(`Block Data added for blocks between ${fromBlock} & ${toBlock}`)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.evm_BlockData.deleteMany())

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
	} else {
		for (const [number, timestamp] of blockList) {
			dbTransactions.push(
				prismaClient.evm_BlockData.upsert({
					where: { number },
					update: {},
					create: {
						number,
						timestamp
					}
				})
			)
		}
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded BlockData:', blockList.size)
}
