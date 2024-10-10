import type prisma from '@prisma/client'
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
const blockSyncKeyLogs = 'lastSyncedBlock_logs_stakers'

interface StakerEntryRecord {
	operatorAddress: string | null
	shares: { shares: bigint; strategyAddress: string }[]
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

export async function seedStakers(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const stakers: IMap<string, StakerEntryRecord> = new Map()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Stakers from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	if (firstBlock === baseBlock) {
		await prismaClient.stakerStrategyShares.deleteMany()
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			let allLogs: any[] = []

			await prismaClient.eventLogs_StakerDelegated
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [...allLogs, ...logs.map((log) => ({ ...log, eventName: 'StakerDelegated' }))]
				})

			await prismaClient.eventLogs_StakerUndelegated
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [...allLogs, ...logs.map((log) => ({ ...log, eventName: 'StakerUndelegated' }))]
				})

			await prismaClient.eventLogs_OperatorSharesIncreased
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [
						...allLogs,
						...logs.map((log) => ({
							...log,
							eventName: 'OperatorSharesIncreased'
						}))
					]
				})

			await prismaClient.eventLogs_OperatorSharesDecreased
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [
						...allLogs,
						...logs.map((log) => ({
							...log,
							eventName: 'OperatorSharesDecreased'
						}))
					]
				})

			// Sort all logs by their block number and log index
			allLogs = allLogs.sort((a, b) => {
				if (a.blockNumber === b.blockNumber) {
					return a.transactionIndex - b.transactionIndex
				}

				return Number(a.blockNumber - b.blockNumber)
			})

			// Stakers list
			const stakerAddresses = allLogs.map((l) => String(l.staker).toLowerCase())
			const stakerInit =
				firstBlock !== baseBlock
					? await prismaClient.staker.findMany({
							where: { address: { in: stakerAddresses } },
							include: {
								shares: true
							}
					  })
					: []

			for (const l in allLogs) {
				const log = allLogs[l]

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
					const shares = BigInt(log.shares)
					if (!shares) continue

					let foundSharesIndex = stakers
						.get(stakerAddress)
						.shares.findIndex(
							(ss) => ss.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
						)

					if (foundSharesIndex !== undefined && foundSharesIndex === -1) {
						stakers.get(stakerAddress).shares.push({ shares: 0n, strategyAddress })

						foundSharesIndex = stakers
							.get(stakerAddress)
							.shares.findIndex(
								(os) => os.strategyAddress.toLowerCase() === strategyAddress.toLowerCase()
							)
					}

					if (log.eventName === 'OperatorSharesIncreased') {
						stakers.get(stakerAddress).shares[foundSharesIndex].shares =
							stakers.get(stakerAddress).shares[foundSharesIndex].shares + shares
					} else if (log.eventName === 'OperatorSharesDecreased') {
						stakers.get(stakerAddress).shares[foundSharesIndex].shares =
							stakers.get(stakerAddress).shares[foundSharesIndex].shares - shares
					}
				}
			}

			console.log(`[Batch] Stakers from: ${fromBlock} to: ${toBlock}`)
		},
		10_000n
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

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Stakers from: ${firstBlock} to: ${lastBlock} size: ${stakers.size}`
	)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
