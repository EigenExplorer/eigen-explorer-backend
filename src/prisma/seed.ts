import prisma from './prismaClient'
import publicViemClient from '../viem/viemClient'
import { parseAbiItem } from 'viem'
import {
	EntityMetadata,
	isValidMetadataUrl,
	validateMetadata
} from '../utils/metadata'

// Hardcoded base block for seeding
const baseBlock = 1159609n

async function seedAvs() {
	let avsList: Map<string, EntityMetadata> = new Map()

	console.log('Seeding AVS ...')

	// Seed operators from event logs
	let latestBlock = await publicViemClient.getBlockNumber()
	let currentBlock = baseBlock
	let nextBlock = baseBlock

	while (nextBlock < latestBlock) {
		nextBlock = currentBlock + 9999n
		if (nextBlock >= latestBlock) nextBlock = latestBlock

		const logs = await publicViemClient.getLogs({
			address: '0x055733000064333CaDDbC92763c58BF0192fFeBf',
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
		await prisma.avs.upsert({
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

async function seedOperators() {
	let operatorList: Map<string, EntityMetadata> = new Map()

	// Seed operators from event logs
	let latestBlock = await publicViemClient.getBlockNumber()
	let currentBlock = baseBlock
	let nextBlock = baseBlock

	while (nextBlock < latestBlock) {
		nextBlock = currentBlock + 9999n
		if (nextBlock >= latestBlock) nextBlock = latestBlock

		const logs = await publicViemClient.getLogs({
			address: '0xA44151489861Fe9e3055d95adC98FbD462B948e7',
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
		await prisma.operator.upsert({
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

async function main() {
	await seedAvs()
	await seedOperators()
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
