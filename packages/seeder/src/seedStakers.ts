import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	type IMap,
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_stakers'

interface StakerEntryRecord {
	operatorAddress: string | null
	shares: { shares: bigint; strategyAddress: string }[]
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

export async function seedStakers(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding stakers ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const stakers: IMap<string, StakerEntryRecord> = new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	if (firstBlock === baseBlock) {
		await prismaClient.stakerStrategyShares.deleteMany()
	}

	const logsStakerDelegated = await prismaClient.eventLogs_StakerDelegated
		.findMany({
			where: {
				blockNumber: {
					gte: firstBlock,
					lte: lastBlock
				}
			}
		})
		.then((logs) =>
			logs.map((log) => ({ ...log, eventName: 'StakerDelegated' }))
		)

	const logsStakerUndelegated = await prismaClient.eventLogs_StakerUndelegated
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
				logs.map((log) => ({ ...log, eventName: 'OperatorSharesDecreased' }))
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

	const logs = [
		...logsStakerDelegated,
		...logsStakerUndelegated,
		...logsOperatorSharesIncreased,
		...logsOperatorSharesDecreased
	]

	// Stakers list
	const stakerAddresses = logs.map((l) => String(l.staker).toLowerCase())
	const stakerInit = await prismaClient.staker.findMany({
		where: { address: { in: stakerAddresses } },
		include: {
			shares: true
		}
	})

	for (const l in logs) {
		const log = logs[l]

		const operatorAddress = String(log.operator).toLowerCase()
		const stakerAddress = String(log.staker).toLowerCase()

		const blockNumber = BigInt(log.blockNumber)
		const timestamp = log.blockTime

		// Load existing staker shares data
		if (!stakers.has(stakerAddress)) {
			const foundStakerInit = stakerInit.find(
				(s) => s.address.toLowerCase() === stakerAddress.toLowerCase()
			)
			if (foundStakerInit) {
				// Address not in this set of logs but in db
				stakers.set(stakerAddress, {
					operatorAddress: foundStakerInit.operatorAddress,
					shares: foundStakerInit.shares.map((s) => ({
						...s,
						shares: BigInt(s.shares)
					})),
					createdAtBlock: foundStakerInit.createdAtBlock,
					updatedAtBlock: blockNumber,
					createdAt: foundStakerInit.createdAt,
					updatedAt: timestamp
				})
			} else {
				// Address neither in this set of logs nor in db
				stakers.set(stakerAddress, {
					operatorAddress: null,
					shares: [],
					createdAtBlock: blockNumber,
					updatedAtBlock: blockNumber,
					createdAt: timestamp,
					updatedAt: timestamp
				})
			}
		} else {
			// Address previously found in this set of logs
			stakers.get(stakerAddress).updatedAtBlock = blockNumber
			stakers.get(stakerAddress).updatedAt = timestamp
		}

		if (log.eventName === 'StakerDelegated') {
			stakers.get(stakerAddress).operatorAddress = operatorAddress
		} else if (log.eventName === 'StakerUndelegated') {
			stakers.get(stakerAddress).operatorAddress = null
		} else if (
			log.eventName === 'OperatorSharesIncreased' ||
			log.eventName === 'OperatorSharesDecreased'
		) {
			const strategyAddress = String(log.strategy).toLowerCase()
			const shares = log.shares
			if (!shares) continue

			let foundSharesIndex = stakers
				.get(stakerAddress)
				.shares.findIndex(
					(ss) =>
						ss.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
				)

			if (foundSharesIndex !== undefined && foundSharesIndex === -1) {
				stakers.get(stakerAddress).shares.push({ shares: 0n, strategyAddress })

				foundSharesIndex = stakers
					.get(stakerAddress)
					.shares.findIndex(
						(os) =>
							os.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
					)
			}

			if (log.eventName === 'OperatorSharesIncreased') {
				stakers.get(stakerAddress).shares[foundSharesIndex].shares =
					stakers.get(stakerAddress).shares[foundSharesIndex].shares +
					BigInt(shares)
			} else if (log.eventName === 'OperatorSharesDecreased') {
				stakers.get(stakerAddress).shares[foundSharesIndex].shares =
					stakers.get(stakerAddress).shares[foundSharesIndex].shares -
					BigInt(shares)
			}
		}
	}

	console.log(
		`Stakers deployed between blocks ${fromBlock} ${toBlock}: ${logs.length}`
	)

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		// Clear existing table
		dbTransactions.push(prismaClient.stakerStrategyShares.deleteMany())
		dbTransactions.push(prismaClient.staker.deleteMany())

		const newStakers: prisma.Staker[] = []
		const newStakerShares: prisma.StakerStrategyShares[] = []

		for (const [stakerAddress, stakerDetails] of stakers) {
			newStakers.push({
				address: stakerAddress,
				operatorAddress: stakerDetails.operatorAddress,
				createdAtBlock: stakerDetails.createdAtBlock,
				updatedAtBlock: stakerDetails.updatedAtBlock,
				createdAt: stakerDetails.createdAt,
				updatedAt: stakerDetails.updatedAt
			})

			stakerDetails.shares.map((share) => {
				newStakerShares.push({
					stakerAddress,
					strategyAddress: share.strategyAddress,
					shares: share.shares.toString()
				})
			})
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
						operatorAddress: stakerDetails.operatorAddress,
						createdAtBlock: stakerDetails.createdAtBlock,
						updatedAtBlock: stakerDetails.updatedAtBlock,
						createdAt: stakerDetails.createdAt,
						updatedAt: stakerDetails.updatedAt
					},
					update: {
						operatorAddress: stakerDetails.operatorAddress,
						updatedAtBlock: stakerDetails.updatedAtBlock,
						updatedAt: stakerDetails.updatedAt
					}
				})
			)

			stakerDetails.shares.map((share) => {
				dbTransactions.push(
					prismaClient.stakerStrategyShares.upsert({
						where: {
							stakerAddress_strategyAddress: {
								stakerAddress,
								strategyAddress: share.strategyAddress
							}
						},
						create: {
							stakerAddress,
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

	console.log('Seeded stakers:', stakers.size)
}
