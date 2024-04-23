import { getPrismaClient } from './utils/prismaClient'
import { parseAbiItem } from 'viem'
import { isValidMetadataUrl, validateMetadata } from './utils/metadata'
import type { EntityMetadata } from './utils/metadata'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operators'

export async function seedOperators(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding Operators ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const operatorList: Map<string, EntityMetadata> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().DelegationManager,
			event: parseAbiItem(
				'event OperatorMetadataURIUpdated(address indexed operator, string metadataURI)'
			),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const operatorAddress = String(log.args.operator).toLowerCase()

			// try {
			// 	if (log.args.metadataURI && isValidMetadataUrl(log.args.metadataURI)) {
			// 		const response = await fetch(log.args.metadataURI)
			// 		const data = await response.text()
			// 		const metadata = validateMetadata(data)

			// 		if (metadata) {
			// 			operatorList.set(operatorAddress, metadata)
			// 		} else {
			// 			throw new Error('Missing operator metadata')
			// 		}
			// 	} else {
			// 		throw new Error('Invalid operator metadata uri')
			// 	}
			// } catch (error) {
				operatorList.set(operatorAddress, {
					name: '',
					description: '',
					discord: '',
					logo: '',
					telegram: '',
					website: '',
					x: ''
				})
			// }
		}

		console.log(
			`Operators registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	for (const [address, metadata] of operatorList) {
		dbTransactions.push(
			prismaClient.operator.upsert({
				where: { address },
				update: {
					metadataName: metadata.name,
					metadataDescription: metadata.description,
					metadataLogo: metadata.logo,
					metadataDiscord: metadata.discord,
					metadataTelegram: metadata.telegram,
					metadataWebsite: metadata.website,
					metadataX: metadata.x,
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
				}
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
	
	console.log('Seeded operators:', operatorList.size)
}
