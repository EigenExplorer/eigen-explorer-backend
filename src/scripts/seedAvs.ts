import { parseAbiItem } from 'viem'
import { isValidMetadataUrl, validateMetadata } from '../utils/metadata'
import type { EntityMetadata } from '../utils/metadata'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../viem/viemClient'
import { getPrismaClient } from '../prisma/prismaClient'

/**
 *
 * @param fromBlock
 * @param toBlock
 */
async function seedAvs(fromBlock: bigint, toBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
  const avsList: Map<string, EntityMetadata> = new Map()

	console.log('Seeding AVS ...')

	// Seed avs from event logs
	const latestBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	let currentBlock = fromBlock
	let nextBlock = fromBlock

	while (nextBlock < latestBlock) {
		nextBlock = currentBlock + 9999n
		if (nextBlock >= latestBlock) nextBlock = latestBlock

		const logs = await viemClient.getLogs({
			address: getEigenContracts().AVSDirectory,
			event: parseAbiItem(
				'event AVSMetadataURIUpdated(address indexed avs, string metadataURI)'
			),
			fromBlock: currentBlock,
			toBlock: nextBlock
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
			`Avs registered between blocks ${currentBlock} ${nextBlock}: ${logs.length}`
		)

		currentBlock = nextBlock
	}

	for (const [address, metadata] of avsList) {
		await prismaClient.avs.upsert({
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
	}

	console.log('Seeded AVS:', avsList.size)
}
