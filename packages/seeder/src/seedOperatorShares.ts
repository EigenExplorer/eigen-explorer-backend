import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	type IMap,
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

	const logsOperatorSharesIncreased =
		await prismaClient.eventLogs_OperatorSharesIncreased
			.findMany({
				where: {
					blockNumber: {
						gte: firstBlock,
						lte: lastBlock
					}
				}
			})
			.then((logs) =>
				logs.map((log) => ({ ...log, eventName: 'OperatorSharesIncreased' }))
			)

	const logsOperatorSharesDecreased =
		await prismaClient.eventLogs_OperatorSharesDecreased
			.findMany({
				where: {
					blockNumber: {
						gte: firstBlock,
						lte: lastBlock
					}
				}
			})
			.then((logs) =>
				logs.map((log) => ({ ...log, eventName: 'OperatorSharesDecreased' }))
			)

	const logs = [...logsOperatorSharesIncreased, ...logsOperatorSharesDecreased]

	// Operators list
	const operatorAddresses = logs.map((l) => String(l.operator).toLowerCase())

	const operatorInit = await prismaClient.operator.findMany({
		where: { address: { in: operatorAddresses } },
		include: {
			shares: true
		}
	})

	for (const l in logs) {
		const log = logs[l]

		const operatorAddress = String(log.operator).toLowerCase()
		const strategyAddress = String(log.strategy).toLowerCase()
		const shares = log.shares
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
				operatorShares.get(operatorAddress)[foundSharesIndex].shares +
				BigInt(shares)
		} else if (log.eventName === 'OperatorSharesDecreased') {
			operatorShares.get(operatorAddress)[foundSharesIndex].shares =
				operatorShares.get(operatorAddress)[foundSharesIndex].shares -
				BigInt(shares)
		}
	}

	console.log(
		`Operator shares updated between blocks ${firstBlock} ${lastBlock}: ${logs.length}`
	)

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
