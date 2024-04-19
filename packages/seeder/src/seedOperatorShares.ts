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

const blockSyncKey = 'lastSyncedBlock_operatorShares'

// Fix for broken types
interface IMap<K, V> extends Map<K, V> {
	get(key: K): V
}

export async function seedOperatorShares(fromBlock?: bigint, toBlock?: bigint) {
	console.log('Seeding operator shares ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const operatorSharesInit: Map<
		string,
		{ shares: string; strategy: string }[]
	> = new Map()
	const operatorShares: IMap<string, { shares: string; strategy: string }[]> =
		new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Load initial operator staker state
	if (firstBlock !== baseBlock) {
		const operators = await prismaClient.operator.findMany({
			select: { address: true, shares: true }
		})

		operators.map((o) => operatorSharesInit.set(o.address, o.shares))
	}

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().DelegationManager,
			events: [
				parseAbiItem(
					'event OperatorSharesIncreased(address indexed operator, address staker, address strategy, uint256 shares)'
				),
				parseAbiItem(
					'event OperatorSharesDecreased(address indexed operator, address staker, address strategy, uint256 shares)'
				)
			],
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const operatorAddress = String(log.args.operator).toLowerCase()
			const strategyAddress = String(log.args.strategy).toLowerCase()
			const shares = log.args.shares || 0n

			if (!operatorShares.has(operatorAddress)) {
				operatorShares.set(
					operatorAddress,
					operatorSharesInit.get(operatorAddress) || []
				)
			}

			let foundSharesIndex = operatorShares
				.get(operatorAddress)
				.findIndex((os) => os.strategy.toLowerCase() === strategyAddress)

			if (foundSharesIndex !== undefined && foundSharesIndex === -1) {
				operatorShares
					.get(operatorAddress)
					.push({ shares: '0', strategy: strategyAddress })

				foundSharesIndex = operatorShares
					.get(operatorAddress)
					.findIndex((os) => os.strategy.toLowerCase() === strategyAddress)
			}

			if (log.eventName === 'OperatorSharesIncreased') {
				operatorShares.get(operatorAddress)[foundSharesIndex].shares = (
					BigInt(operatorShares.get(operatorAddress)[foundSharesIndex].shares) +
					BigInt(shares)
				).toString()
			} else if (log.eventName === 'OperatorSharesDecreased') {
				operatorShares.get(operatorAddress)[foundSharesIndex].shares = (
					BigInt(operatorShares.get(operatorAddress)[foundSharesIndex].shares) -
					BigInt(shares)
				).toString()
			}
		}

		console.log(
			`Operator shares updated between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []
	for (const [operatorAddress, shares] of operatorShares) {
		dbTransactions.push(
			prismaClient.operator.updateMany({
				where: { address: operatorAddress },
				data: {
					shares: {
						set: shares
					}
				}
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	console.log('Seeded operator shares:', operatorShares.size)
}
