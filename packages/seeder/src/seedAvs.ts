import { parseAbiItem } from 'viem'
import { isValidMetadataUrl, validateMetadata } from './utils/metadata'
import type { EntityMetadata } from './utils/metadata'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
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
export async function seedAvs(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding AVS ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const avsList: Map<
		string,
		{ metadata: EntityMetadata; createdAtBlock: string; updatedAtBlock: string }
	> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	const defaultMetadata: EntityMetadata = {
		name: '',
		website: '',
		description: '',
		logo: '',
		x: '',
		discord: '',
		telegram: ''
	}

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
			try {
				const log = logs[l]

				const avsAddress = String(log.args.avs).toLowerCase()
				const blockNumber = log.blockNumber.toString()

				if (log.args.metadataURI && isValidMetadataUrl(log.args.metadataURI)) {
					const response = await fetch(log.args.metadataURI)
					const data = await response.text()
					const avsMetadata = validateMetadata(data)

					if (avsMetadata) {
						const existing = avsList.get(avsAddress)
						if (existing) {
							avsList.set(avsAddress, {
								metadata: avsMetadata,
								createdAtBlock: existing.createdAtBlock,
								updatedAtBlock: blockNumber
							})
						} else {
							avsList.set(avsAddress, {
								metadata: avsMetadata,
								createdAtBlock: blockNumber,
								updatedAtBlock: blockNumber
							})
						}
					} else {
						if (!avsList.has(avsAddress)) {
							avsList.set(avsAddress, {
								metadata: defaultMetadata,
								createdAtBlock: blockNumber,
								updatedAtBlock: blockNumber
							})
						}
					}
				} else {
					if (!avsList.has(avsAddress)) {
						avsList.set(avsAddress, {
							metadata: defaultMetadata,
							createdAtBlock: blockNumber,
							updatedAtBlock: blockNumber
						})
					}
				}
			} catch {}
		}

		console.log(
			`Avs registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avs.deleteMany())

		const newAvs: {
			address: string
			metadataName: string
			metadataDescription: string
			metadataDiscord?: string | null
			metadataLogo?: string | null
			metadataTelegram?: string | null
			metadataWebsite?: string | null
			metadataX?: string | null
			createdAtBlock: string
			updatedAtBlock: string
		}[] = []

		for (const [
			address,
			{ metadata, createdAtBlock, updatedAtBlock }
		] of avsList) {
			newAvs.push({
				address,
				metadataName: metadata.name,
				metadataDescription: metadata.description,
				metadataLogo: metadata.logo,
				metadataDiscord: metadata.discord,
				metadataTelegram: metadata.telegram,
				metadataWebsite: metadata.website,
				metadataX: metadata.x,
				createdAtBlock,
				updatedAtBlock
			})
		}

		dbTransactions.push(
			prismaClient.avs.createMany({
				data: newAvs,
				skipDuplicates: true
			})
		)
	} else {
		for (const [
			address,
			{ metadata, createdAtBlock, updatedAtBlock }
		] of avsList) {
			dbTransactions.push(
				prismaClient.avs.upsert({
					where: { address },
					update: {
						metadataName: metadata.name,
						metadataDescription: metadata.description,
						metadataLogo: metadata.logo,
						metadataDiscord: metadata.discord,
						metadataTelegram: metadata.telegram,
						metadataWebsite: metadata.website,
						metadataX: metadata.x,
						updatedAtBlock
					},
					create: {
						address,
						metadataName: metadata.name,
						metadataDescription: metadata.description,
						metadataLogo: metadata.logo,
						metadataDiscord: metadata.discord,
						metadataTelegram: metadata.telegram,
						metadataWebsite: metadata.website,
						metadataX: metadata.x,
						createdAtBlock,
						updatedAtBlock
					}
				})
			)
		}
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded AVS:', avsList.size)
}
