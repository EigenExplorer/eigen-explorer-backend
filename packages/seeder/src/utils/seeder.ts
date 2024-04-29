import { getPrismaClient } from './prismaClient'
import { chunkArray } from './array'

// Fix for broken types
export interface IMap<K, V> extends Map<K, V> {
	get(key: K): V
}

// Base block
export const baseBlock =
	process.env.NETWORK && process.env.NETWORK === 'holesky'
		? 1159609n
		: 19500000n

export async function loopThroughBlocks(
	firstBlock: bigint,
	lastBlock: bigint,
	cb: (fromBlock: bigint, toBlock: bigint) => Promise<void>
) {
	let currentBlock = firstBlock
	let nextBlock = firstBlock

	while (nextBlock < lastBlock) {
		nextBlock = currentBlock + 4999n
		if (nextBlock >= lastBlock) nextBlock = lastBlock

		await cb(currentBlock, nextBlock)

		currentBlock = nextBlock
	}

	return lastBlock
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function bulkUpdateDbTransactions(dbTransactions: any[]) {
	const prismaClient = getPrismaClient()
	const chunkSize = 1000

	let i = 0
	console.log('Updating db transactions', dbTransactions.length)

	for (const chunk of chunkArray(dbTransactions, chunkSize)) {
		console.time(`Updating db transactions ${i}, size: ${chunk.length}`)
		await prismaClient.$transaction(chunk)
		console.timeEnd(`Updating db transactions ${i}, size: ${chunk.length}`)

		i++
	}
}

export async function fetchLastSyncBlock(key: string): Promise<bigint> {
	const prismaClient = getPrismaClient()

	const lastSyncedBlockData = await prismaClient.settings.findUnique({
		where: { key }
	})

	return lastSyncedBlockData?.value
		? BigInt(lastSyncedBlockData.value as number)
		: baseBlock
}

export async function saveLastSyncBlock(key: string, blockNumber: bigint) {
	const prismaClient = getPrismaClient()

	await prismaClient.settings.upsert({
		where: { key: key },
		update: { value: Number(blockNumber) },
		create: { key: key, value: Number(blockNumber) }
	})
}
