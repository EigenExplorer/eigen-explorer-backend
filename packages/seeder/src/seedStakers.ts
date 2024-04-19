import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './viem/viemClient'
import { getPrismaClient } from './prisma/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_stakers'

export async function seedStakers(fromBlock?: bigint, toBlock?: bigint) {
	console.log('Seeding stakers ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const operatorStakersInit: Map<string, string[]> = new Map()
	const operatorStakers: Map<string, string[]> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Load initial operator staker state
	if (firstBlock !== baseBlock) {
		const operators = await prismaClient.operator.findMany({
			select: { address: true, stakers: true }
		})

		operators.map((o) => operatorStakersInit.set(o.address, o.stakers))
	}

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().DelegationManager,
			events: [
				parseAbiItem(
					'event StakerDelegated(address indexed staker, address indexed operator)'
				),
				parseAbiItem(
					'event StakerUndelegated(address indexed staker, address indexed operator)'
				)
			],
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const operatorAddress = String(log.args.operator).toLowerCase()
			const stakerAddress = String(log.args.staker).toLowerCase()

			if (!operatorStakers.has(operatorAddress)) {
				operatorStakers.set(
					operatorAddress,
					operatorStakersInit.get(operatorAddress) || []
				)
			}

			if (log.eventName === 'StakerDelegated') {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				operatorStakers.get(operatorAddress)!.push(stakerAddress)
			} else if (log.eventName === 'StakerUndelegated') {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				operatorStakers.get(operatorAddress)!.splice(
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					operatorStakers
						.get(operatorAddress)!
						.indexOf(stakerAddress),
					1
				)
			}
		}

		console.log(
			`Stakers deployed between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	for (const [operatorAddress, stakers] of operatorStakers) {
		dbTransactions.push(
			prismaClient.operator.updateMany({
				where: { address: operatorAddress },
				data: {
					stakers: {
						set: stakers
					},
					totalStakers: stakers.length
				}
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	console.log('Seeded stakers:', operatorStakers.size)
}
