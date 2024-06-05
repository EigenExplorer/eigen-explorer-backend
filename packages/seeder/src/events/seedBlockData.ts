import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getViemClient } from '../utils/viemClient'
import { baseBlock, loopThroughBlocks } from '../utils/seeder'

export async function seedBlockData(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding Block Data ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const lastKnownBlock = await prismaClient.evm_BlockData.findFirst({
		orderBy: { number: 'desc' }
	})

	const firstBlock = fromBlock
		? fromBlock
		: lastKnownBlock
		  ? lastKnownBlock.number
		  : baseBlock

	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Retrieve blocks in batches and extract timestamps
	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const promises: any[] = []
			for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
				promises.push(viemClient.getBlock({ blockNumber: blockNumber }))
			}

			const blocks = await Promise.all(promises)
			const newBlockData: prisma.Evm_BlockData[] = []

			for (const block of blocks) {
				const timestamp = new Date(Number(block.timestamp) * 1000)

				newBlockData.push({
					number: block.number,
					timestamp
				})
			}

			await prismaClient.evm_BlockData.createMany({
				data: newBlockData,
				skipDuplicates: true
			})

			console.log(`Retrieved Block Data for ${fromBlock} - ${toBlock}`)
		},
		99n
	)

	console.log('Seeded Block Data:', Number(lastBlock - firstBlock))
}
