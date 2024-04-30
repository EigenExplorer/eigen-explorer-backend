import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	IMap,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operatorShares'

export async function seedOperatorShares(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding operator shares ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const operatorShares: IMap<
		string,
		{ shares: bigint; strategyAddress: string }[]
	> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	if (firstBlock === baseBlock) {
		await prismaClient.operatorStrategyShares.deleteMany()
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

		// Operators list
		const operatorAddresses = logs.map((l) =>
			String(l.args.operator).toLowerCase()
		)

		const operatorInit = await prismaClient.operator.findMany({
			where: { address: { in: operatorAddresses } },
			include: {
				shares: true
			}
		})

		for (const l in logs) {
			const log = logs[l]

			const operatorAddress = String(log.args.operator).toLowerCase()
			const strategyAddress = String(log.args.strategy).toLowerCase()
			const shares = log.args.shares
			if (!shares) continue

			// Load existing staker shares data
			if (!operatorShares.has(operatorAddress)) {
				const foundOperatorInit = operatorInit.find(
					(o) => o.address.toLowerCase() === operatorAddress.toLowerCase()
				)
				if (foundOperatorInit) {
					operatorShares.set(
						operatorAddress,
						foundOperatorInit.shares.map((o) => ({
							...o,
							shares: BigInt(o.shares)
						}))
					)
				} else {
					operatorShares.set(operatorAddress, [])
				}
			}

			let foundSharesIndex = operatorShares
				.get(operatorAddress)
				.findIndex(
					(os) =>
						os.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
				)

			if (foundSharesIndex !== undefined && foundSharesIndex === -1) {
				operatorShares
					.get(operatorAddress)
					.push({ shares: 0n, strategyAddress: strategyAddress })

				foundSharesIndex = operatorShares
					.get(operatorAddress)
					.findIndex(
						(os) =>
							os.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
					)
			}

			if (log.eventName === 'OperatorSharesIncreased') {
				operatorShares.get(operatorAddress)[foundSharesIndex].shares =
					operatorShares.get(operatorAddress)[foundSharesIndex].shares + shares
			} else if (log.eventName === 'OperatorSharesDecreased') {
				operatorShares.get(operatorAddress)[foundSharesIndex].shares =
					operatorShares.get(operatorAddress)[foundSharesIndex].shares - shares
			}
		}

		console.log(
			`Operator shares updated between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		// Clear existing table
		dbTransactions.push(prismaClient.operatorStrategyShares.deleteMany())

		const newOperatorShares: {
			operatorAddress: string
			strategyAddress: string
			shares: string
		}[] = []

		for (const [operatorAddress, shares] of operatorShares) {
			shares.map((share) => {
				newOperatorShares.push({
					operatorAddress,
					strategyAddress: share.strategyAddress,
					shares: share.shares.toString()
				})
			})
		}

		dbTransactions.push(
			prismaClient.operatorStrategyShares.createMany({
				data: newOperatorShares,
				skipDuplicates: true
			})
		)
	} else {
		for (const [operatorAddress, shares] of operatorShares) {
			shares.map((share) => {
				dbTransactions.push(
					prismaClient.operatorStrategyShares.upsert({
						where: {
							operatorAddress_strategyAddress: {
								operatorAddress,
								strategyAddress: share.strategyAddress
							}
						},
						create: {
							operatorAddress,
							strategyAddress: share.strategyAddress,
							shares: share.shares.toString()
						},
						update: {
							shares: share.shares.toString()
						}
					})
				)
			})
		}
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded operator shares:', operatorShares.size)
}
