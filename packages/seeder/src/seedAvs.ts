import { parseAbiItem } from 'viem'
import {
	isValidMetadataUrl,
	validateMetadata
} from './utils/metadata'
import type { EntityMetadata } from './utils/metadata'
import { getEigenContracts } from './data/address'
import { getViemClient } from './viem/viemClient'
import { getPrismaClient } from './prisma/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avs'

/**
 * Utility function to seed avs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedAvs(fromBlock?: bigint, toBlock?: bigint) {
	console.log('Seeding AVS ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const avsList: Map<string, EntityMetadata> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().AVSDirectory,
			event: parseAbiItem(
				'event AVSMetadataURIUpdated(address indexed avs, string metadataURI)'
			),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const avsAddress = String(log.args.avs).toLowerCase()

			if (log.args.metadataURI && isValidMetadataUrl(log.args.metadataURI)) {
				const response = await fetch(log.args.metadataURI)
				const data = await response.text()
				const avsMetadata = validateMetadata(data)

				if (avsMetadata) {
					avsList.set(avsAddress, avsMetadata)
				}
			}
		}

		console.log(
			`Avs registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	for (const [address, metadata] of avsList) {
		dbTransactions.push(
			prismaClient.avs.upsert({
				where: { address },
				update: {
					metadata: {
						set: metadata
					}
				},
				create: {
					address,
					metadata: {
						set: metadata
					},
					tags: []
				}
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	console.log('Seeded AVS:', avsList.size)
}
