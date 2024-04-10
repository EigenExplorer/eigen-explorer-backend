import { parseAbiItem } from 'viem'
import { getViemClient } from '../viem/viemClient'
import { getPrismaClient } from '../prisma/prismaClient'

export async function seedValidatorsRestake(fromBlock: bigint, toBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const validatorRestakeList: {
		podAddress: string
		validatorIndex: number
		blockNumber: bigint
	}[] = []
	const validatorIndicies: number[] = []

	console.log('Seeding Validator Restake ...')

	const latestBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	let currentBlock = fromBlock
	let nextBlock = fromBlock

	while (nextBlock < latestBlock) {
		nextBlock = currentBlock + 9999n
		if (nextBlock >= latestBlock) nextBlock = latestBlock

		const logs = await viemClient.getLogs({
			event: parseAbiItem('event ValidatorRestaked(uint40 validatorIndex)'),
			fromBlock: currentBlock,
			toBlock: nextBlock
		})

		for (const l in logs) {
			const log = logs[l]

			if (log.args.validatorIndex) {
				validatorRestakeList.push({
					podAddress: log.address.toLowerCase(),
					validatorIndex: log.args.validatorIndex,
					blockNumber: log.blockNumber
				})

				validatorIndicies.push(log.args.validatorIndex)
			}
		}

		console.log(
			`Validator restaked between blocks ${currentBlock} ${nextBlock}: ${logs.length}`
		)

		currentBlock = nextBlock
	}

	// Create
	await prismaClient.validatorRestake.createMany({
		data: validatorRestakeList
	})

	console.log('Seeded Validator Restake')
}
