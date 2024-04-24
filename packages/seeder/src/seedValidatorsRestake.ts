import { parseAbiItem } from 'viem'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_validatorsRestake'

export async function seedValidatorsRestake(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	console.log('Seeding Validator Restake ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const validatorRestakeList: {
		podAddress: string
		validatorIndex: number
		blockNumber: bigint
	}[] = []
	const validatorIndicies: number[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			event: parseAbiItem('event ValidatorRestaked(uint40 validatorIndex)'),
			fromBlock,
			toBlock
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
			`Validator restaked between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	// Prepare db transaction object
	if (validatorRestakeList.length > 0) {
		await prismaClient.validatorRestake.createMany({
			data: validatorRestakeList
		})
	}

	console.log('Seeded validator restake:', validatorRestakeList.length)
}
