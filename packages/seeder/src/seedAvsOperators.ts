import { parseAbiItem } from 'viem'
import { getViemClient } from './viem/viemClient'
import { getEigenContracts } from './data/address'
import { getPrismaClient } from './prisma/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const baseBlock = 1159609n
const blockSyncKey = 'lastSyncedBlock_avsOperators'

export async function seedAvsOperators(fromBlock?: bigint, toBlock?: bigint) {
	console.log('Seeding AVS Operators ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const avsOperatorsList: Map<string, Map<string, number>> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Load initial operator staker state
	if (firstBlock !== baseBlock) {
		const avs = await prismaClient.avs.findMany({
			select: { address: true, operators: true }
		})

		avs.map((a) =>
			avsOperatorsList.set(
				a.address,
				new Map(a.operators.map((ao) => [ao.address, ao.isActive ? 1 : 0]))
			)
		)
	}

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

			if (!avsOperatorsList.has(avsAddress)) {
				avsOperatorsList.set(avsAddress, new Map())
			}

			avsOperatorsList
				.get(avsAddress)
				?.set(operatorAddress, log.args.status || 0)
		}

		console.log(
			`Avs operators updated between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	for (const [avsAddress, operatorsMap] of avsOperatorsList) {
		const avsOperatorsStatus: { address: string; isActive: boolean }[] = []

		for (const [operatorAddress, status] of operatorsMap) {
			avsOperatorsStatus.push({
				address: operatorAddress,
				isActive: status === 1
			})
		}

		dbTransactions.push(
			prismaClient.avs.updateMany({
				where: { address: avsAddress },
				data: {
					operators: {
						set: avsOperatorsStatus
					}
				}
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	console.log('Seeded AVS Operators:', avsOperatorsList.size)
}
