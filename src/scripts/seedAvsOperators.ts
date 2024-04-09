import { parseAbiItem } from 'viem'
import { getViemClient } from '../viem/viemClient'
import { getEigenContracts } from '../data/address'
import { getPrismaClient } from '../prisma/prismaClient'

async function seedAvsOperators(fromBlock: bigint, toBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
  
	const avsOperatorsList: Map<string, Map<string, number>> = new Map()
	console.log('Seeding AVS Operators ...')

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
				'event OperatorAVSRegistrationStatusUpdated(address indexed operator, address indexed avs, uint8 status)'
			),
			fromBlock: currentBlock,
			toBlock: nextBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const avsAddress = String(log.args.avs).toLowerCase()
			const operatorAddress = String(log.args.operator).toLowerCase()

			if (!avsOperatorsList.has(avsAddress)) {
				avsOperatorsList.set(avsAddress, new Map())
			}

			avsOperatorsList
				.get(avsAddress)
				?.set(operatorAddress, log.args.status || 0)
		}

		console.log(
			`Avs operators updated between blocks ${currentBlock} ${nextBlock}: ${logs.length}`
		)

		currentBlock = nextBlock
	}

	for (const [avsAddress, operatorsMap] of avsOperatorsList) {
		const avsOperatorsStatus: { address: string; isActive: boolean }[] = []

		for (const [operatorAddress, status] of operatorsMap) {
			avsOperatorsStatus.push({
				address: operatorAddress,
				isActive: status === 1
			})
		}

		await prismaClient.avs.updateMany({
			where: { address: avsAddress },
			data: {
				operators: {
					set: avsOperatorsStatus
				}
			}
		})
	}

	console.log('Seeded AVS Operators: ', avsOperatorsList.size)
}
