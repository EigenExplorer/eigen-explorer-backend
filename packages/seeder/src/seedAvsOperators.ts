import { parseAbiItem } from 'viem'
import { getViemClient } from './utils/viemClient'
import { getEigenContracts } from './data/address'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avsOperators'

export async function seedAvsOperators(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding AVS Operators ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const avsOperatorsList: Map<string, Map<string, number>> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Load initial operator staker state
	const avs = await prismaClient.avs.findMany({
		select: { address: true }
	})

	avs.map((a) => avsOperatorsList.set(a.address, new Map()))

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().AVSDirectory,
			event: parseAbiItem(
				'event OperatorAVSRegistrationStatusUpdated(address indexed operator, address indexed avs, uint8 status)'
			),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const avsAddress = String(log.args.avs).toLowerCase()
			const operatorAddress = String(log.args.operator).toLowerCase()

			if (avsOperatorsList.has(avsAddress)) {
				avsOperatorsList
					.get(avsAddress)
					?.set(operatorAddress, log.args.status || 0)
			}
		}

		console.log(
			`Avs operators updated between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	for (const [avsAddress, operatorsMap] of avsOperatorsList) {
		for (const [operatorAddress, status] of operatorsMap) {
			console.log('avs', avsAddress, operatorAddress, status)

			dbTransactions.push(
				prismaClient.avsOperator.upsert({
					where: {
						avsAddress_operatorAddress: { avsAddress, operatorAddress }
					},
					create: {
						operatorAddress,
						avsAddress,
						isActive: status === 1
					},
					update: {
						isActive: status === 1
					}
				})
			)
		}
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded AVS Operators:', avsOperatorsList.size)
}
