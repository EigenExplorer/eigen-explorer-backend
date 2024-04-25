import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_stakers'

// Fix for broken types
interface IMap<K, V> extends Map<K, V> {
	get(key: K): V
}

export async function seedStakers(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding stakers ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const stakers: IMap<
		string,
		{
			operatorAddress: string | null
			shares: { shares: string; strategy: string }[]
		}
	> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

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
				),
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
			const stakerAddress = String(log.args.staker).toLowerCase()

			if (!stakers.has(stakerAddress)) {
				stakers.set(stakerAddress, { operatorAddress: null, shares: [] })
			}

			if (log.eventName === 'StakerDelegated') {
				stakers.get(stakerAddress).operatorAddress = operatorAddress
			} else if (log.eventName === 'StakerUndelegated') {
				stakers.get(stakerAddress).operatorAddress = null
			} else if (
				log.eventName === 'OperatorSharesIncreased' ||
				log.eventName === 'OperatorSharesDecreased'
			) {
				const strategyAddress = String(log.args.strategy).toLowerCase()
				const shares = log.args.shares
				if (!shares) continue

				let foundSharesIndex = stakers
					.get(stakerAddress)
					.shares.findIndex(
						(ss) => ss.strategy.toLowerCase() === strategyAddress
					)

				if (foundSharesIndex !== undefined && foundSharesIndex === -1) {
					stakers
						.get(stakerAddress)
						.shares.push({ shares: '0', strategy: strategyAddress })

					foundSharesIndex = stakers
						.get(stakerAddress)
						.shares.findIndex(
							(os) => os.strategy.toLowerCase() === strategyAddress
						)
				}

				if (log.eventName === 'OperatorSharesIncreased') {
					stakers.get(stakerAddress).shares[foundSharesIndex].shares = (
						BigInt(stakers.get(stakerAddress).shares[foundSharesIndex].shares) +
						BigInt(shares)
					).toString()
				} else if (log.eventName === 'OperatorSharesDecreased') {
					stakers.get(stakerAddress).shares[foundSharesIndex].shares = (
						BigInt(stakers.get(stakerAddress).shares[foundSharesIndex].shares) -
						BigInt(shares)
					).toString()
				}
			}
		}

		console.log(
			`Stakers deployed between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		// Clear existing table
		dbTransactions.push(prismaClient.stakerStrategyShares.deleteMany())
		dbTransactions.push(prismaClient.staker.deleteMany())

		const newStakers: { address: string; operatorAddress: string }[] = []
		const newStakerShares: {
			stakerAddress: string
			strategyAddress: string
			shares: string
		}[] = []

		for (const [stakerAddress, stakerDetails] of stakers) {
			if (stakerDetails.operatorAddress) {
				newStakers.push({
					address: stakerAddress,
					operatorAddress: stakerDetails.operatorAddress
				})

				stakerDetails.shares.map((share) => {
					newStakerShares.push({
						stakerAddress,
						strategyAddress: share.strategy,
						shares: share.shares
					})
				})
			}
		}

		dbTransactions.push(
			prismaClient.staker.createMany({
				data: newStakers,
				skipDuplicates: true
			})
		)

		dbTransactions.push(
			prismaClient.stakerStrategyShares.createMany({
				data: newStakerShares,
				skipDuplicates: true
			})
		)
	} else {
		for (const [stakerAddress, stakerDetails] of stakers) {
			dbTransactions.push(
				prismaClient.staker.upsert({
					where: { address: stakerAddress },
					create: {
						address: stakerAddress,
						operatorAddress: stakerDetails.operatorAddress
					},
					update: {
						operatorAddress: stakerDetails.operatorAddress
					}
				})
			)

			stakerDetails.shares.map((share) => {
				dbTransactions.push(
					prismaClient.stakerStrategyShares.upsert({
						where: {
							stakerAddress_strategyAddress: {
								stakerAddress,
								strategyAddress: share.strategy
							}
						},
						create: {
							stakerAddress,
							strategyAddress: share.strategy,
							shares: share.shares
						},
						update: {
							shares: share.shares
						}
					})
				)
			})
		}
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded stakers:', stakers.size)
}
