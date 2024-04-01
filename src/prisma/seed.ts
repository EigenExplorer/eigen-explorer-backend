import prisma from './prismaClient'
import publicViemClient from '../viem/viemClient'
import { parseAbiItem } from 'viem'
import {
	EntityMetadata,
	isValidAvsMetadataUrl,
	validateAvsMetadata
} from '../utils/avs'

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

			if (log.args.metadataURI && isValidAvsMetadataUrl(log.args.metadataURI)) {
				const response = await fetch(log.args.metadataURI)
				const data = await response.text()
				const avsMetadata = validateAvsMetadata(data)

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

	console.log('Seeded AVS:', avsList, length)
}

async function seedOperators() {
	let operators: string[] = []
	let operatorMetadata: any = {}

	// Seed operators from event logs
	let latestBlock = await publicViemClient.getBlockNumber()
	let currentBlock = baseBlock
	let nextBlock = baseBlock

	while (nextBlock < latestBlock) {
		nextBlock = currentBlock + 9999n
		if (nextBlock >= latestBlock) nextBlock = latestBlock

		const logs = await publicViemClient.getLogs({
			address: '0xA44151489861Fe9e3055d95adC98FbD462B948e7',
			events: [
				parseAbiItem(
					'event OperatorRegistered(address indexed operator, (address, address, uint32) operatorDetails)'
				),
				parseAbiItem(
					'event OperatorMetadataURIUpdated(address indexed operator, string metadataURI)'
				)
			],
			fromBlock: currentBlock,
			toBlock: nextBlock
		})

		logs.map((l) => {
			if (l.eventName === 'OperatorRegistered') {
				operators.push(String(l.args.operator))
			} else if (l.eventName === 'OperatorMetadataURIUpdated') {
				operatorMetadata[String(l.args.operator)] = l.args.metadataURI
			}
		})

		console.log(
			`operators registered between blocks ${currentBlock} ${nextBlock}: ${logs.length}`
		)
		currentBlock = nextBlock
	}

	// Seed operators metadata from event logs
	console.log(operators.length, Object.keys(operatorMetadata).length)
}

async function main() {
	await seedAvs()
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
