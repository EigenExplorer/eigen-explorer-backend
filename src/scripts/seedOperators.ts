import { getPrismaClient } from '../prisma/prismaClient'
import { parseAbiItem } from 'viem'
import { isValidMetadataUrl, validateMetadata } from '../utils/metadata'
import type { EntityMetadata } from '../utils/metadata'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../viem/viemClient'

async function seedOperators(fromBlock: bigint, toBlock?: bigint) {
  const viemClient = getViemClient()
  const prismaClient = getPrismaClient()

	const operatorList: Map<string, EntityMetadata> = new Map()

	// Seed operators from event logs
	const latestBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

  let currentBlock = fromBlock
	let nextBlock = fromBlock

	while (nextBlock < latestBlock) {
		nextBlock = currentBlock + 9999n
		if (nextBlock >= latestBlock) nextBlock = latestBlock

		const logs = await viemClient.getLogs({
			address: getEigenContracts().DelegationManager,
			event: parseAbiItem(
				'event OperatorMetadataURIUpdated(address indexed operator, string metadataURI)'
			),
			fromBlock: currentBlock,
			toBlock: nextBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const operatorAddress = String(log.args.operator).toLowerCase()

			if (log.args.metadataURI && isValidMetadataUrl(log.args.metadataURI)) {
				const response = await fetch(log.args.metadataURI)
				const data = await response.text()
				const metadata = validateMetadata(data)

				if (metadata) {
					operatorList.set(operatorAddress, metadata)
				}
			}
		}

		console.log(
			`Operators registered between blocks ${currentBlock} ${nextBlock}: ${logs.length}`
		)
		currentBlock = nextBlock
	}

	for (const [address, metadata] of operatorList) {
		await prismaClient.operator.upsert({
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
				}
			}
		})
	}

	console.log('Seeded operators:', operatorList.size)
}