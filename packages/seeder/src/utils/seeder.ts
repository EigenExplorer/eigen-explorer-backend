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
		: 17000000n

// Base time
export const baseTime =
	process.env.NETWORK && process.env.NETWORK === 'holesky'
		? 1710684720000
		: 1680911891000

export async function loopThroughBlocks(
	firstBlock: bigint,
	lastBlock: bigint,
	cb: (fromBlock: bigint, toBlock: bigint) => Promise<void>,
	defaultBatchSize?: bigint
) {
	const batchSize = defaultBatchSize ? defaultBatchSize : 4999n
	let currentBlock = firstBlock
	let nextBlock = firstBlock

	while (nextBlock < lastBlock) {
		nextBlock = currentBlock + batchSize
		if (nextBlock >= lastBlock) nextBlock = lastBlock

		await cb(currentBlock, nextBlock)

		currentBlock = nextBlock
	}

	return lastBlock
}

export async function bulkUpdateDbTransactions(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	label?: string
) {
	const prismaClient = getPrismaClient()
	const chunkSize = 1000

	let i = 0
	console.time(`[DB Write (${dbTransactions.length})] ${label || ''}`)

	for (const chunk of chunkArray(dbTransactions, chunkSize)) {
		await prismaClient.$transaction(chunk)

		i++
	}

	console.timeEnd(`[DB Write (${dbTransactions.length})] ${label || ''}`)
}

// Utility function to format data for UNNEST
function formatForUnnest(data: { number: bigint, timestamp: Date }[]) {
    return {
        numbers: data.map(d => d.number),
        timestamps: data.map(d => d.timestamp.toISOString()),
    };
}

// Modified bulk update function using raw SQL and UNNEST
export async function bulkUpdateDbTransactionsV2(
    dbTransactions: { table: string, data: any[] }[],
    label?: string
) {
    const prismaClient = getPrismaClient();
    console.time(`[DB Write (${dbTransactions.length})] ${label || ''}`);

    for (const transaction of dbTransactions) {
        if (transaction.table === 'evm_BlockData') {
            const formattedData = formatForUnnest(transaction.data);

            await prismaClient.$queryRaw`
                INSERT INTO "evm_BlockData" ("number", "timestamp")
                SELECT * FROM unnest(
                    ${formattedData.numbers}::bigint[],
                    ${formattedData.timestamps}::timestamptz[]
                )
                ON CONFLICT DO NOTHING;
            `;
        } else {
            const chunkSize = 1000;
            for (let i = 0; i < transaction.data.length; i += chunkSize) {
                const chunk = transaction.data.slice(i, i + chunkSize);
                await prismaClient[transaction.table].createMany({
                    data: chunk,
                    skipDuplicates: true,
                });
            }
        }
    }

    console.timeEnd(`[DB Write (${dbTransactions.length})] ${label || ''}`);
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

export async function fetchLastSyncTime(key: string): Promise<number> {
	const prismaClient = getPrismaClient()

	const lastSyncedTimeData = await prismaClient.settings.findUnique({
		where: { key }
	})

	return lastSyncedTimeData?.value
		? lastSyncedTimeData.value as number
		: baseTime
}

export async function saveLastSyncBlock(key: string, blockNumber: bigint) {
	const prismaClient = getPrismaClient()

	await prismaClient.settings.upsert({
		where: { key: key },
		update: { value: Number(blockNumber) },
		create: { key: key, value: Number(blockNumber) }
	})
}

export async function getBlockDataFromDb(fromBlock: bigint, toBlock: bigint) {
	const prismaClient = getPrismaClient()

	const blockData = await prismaClient.evm_BlockData.findMany({
		where: {
			number: {
				gte: BigInt(fromBlock),
				lte: BigInt(toBlock)
			}
		},
		select: {
			number: true,
			timestamp: true
		},
		orderBy: {
			number: 'asc'
		}
	})

	return new Map(blockData.map((block) => [block.number, block.timestamp]))
}

export async function fetchWithTimeout(
	url: string,
	timeout = 5000
): Promise<Response> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeout)

	try {
		const response = await fetch(url, { signal: controller.signal })
		return response
	} catch (error) {
		if (error.name === 'AbortError') {
			throw new Error('Request timed out')
		}
		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}