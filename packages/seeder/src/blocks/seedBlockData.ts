import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getViemClient } from '../utils/viemClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	loopThroughBlocks
} from '../utils/seeder'

export async function seedBlockData(toBlock?: bigint, fromBlock?: bigint) {
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

			await bulkUpdateDbTransactions(
				[
					prismaClient.evm_BlockData.createMany({
						data: newBlockData,
						skipDuplicates: true
					})
				],
				`[Meta] Block data from: ${fromBlock} to: ${toBlock} size: ${Number(
					toBlock - fromBlock
				)}`
			)
		},
		99n
	)
}
