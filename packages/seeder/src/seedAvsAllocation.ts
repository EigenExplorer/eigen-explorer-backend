import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avsAllocation'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_avsAllocation'

type AvsAllocationRecord = {
	magnitude: string
	effectBlock: bigint
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

export async function seedAvsAllocation(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	// (avsAddress-operatorSetId) => operatorAddress => strategyAddress => AvsAllocationRecord
	const avsAllocationList: Map<string, Map<string, Map<string, AvsAllocationRecord>>> = new Map()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0n) {
		console.log(`[In Sync] [Data] AVS Allocation from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const avsOperatorSet = await prismaClient.operatorSet.findMany({
		select: { avsAddress: true, operatorSetId: true }
	})

	avsOperatorSet.map((a) => avsAllocationList.set(`${a.avsAddress}-${a.operatorSetId}`, new Map()))

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs: any[] = await prismaClient.eventLogs_AllocationUpdated.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})

			logs.sort((a, b) => {
				if (a.blockNumber === b.blockNumber && a.transactionIndex === b.transactionIndex) {
					return Number(a.effectBlock) - Number(b.effectBlock)
				}
				return Number(a.blockNumber - b.blockNumber)
			})

			// Process each log
			for (const l in logs) {
				const log = logs[l]

				const avsAddress = String(log.avs).toLowerCase()
				const operatorAddress = String(log.operator).toLowerCase()
				const operatorSetId = BigInt(log.operatorSetId)
				const strategyAddress = String(log.strategy).toLowerCase()

				const operatorSetKey = `${avsAddress}-${operatorSetId}`

				if (avsAllocationList.has(operatorSetKey)) {
					const operatorMap = avsAllocationList.get(operatorSetKey)

					if (!operatorMap) {
						continue
					}

					if (!operatorMap.has(operatorAddress)) {
						operatorMap.set(operatorAddress, new Map())
					}

					const strategyMap = operatorMap.get(operatorAddress)

					// Update the allocation record for this strategy.
					if (strategyMap?.has(strategyAddress)) {
						const existingRecord = strategyMap.get(strategyAddress)!
						strategyMap.set(strategyAddress, {
							magnitude: log.magnitude,
							effectBlock: log.effectBlock,
							createdAtBlock: existingRecord.createdAtBlock,
							updatedAtBlock: BigInt(log.blockNumber),
							createdAt: existingRecord.createdAt,
							updatedAt: log.blockTime
						})
					} else {
						strategyMap?.set(strategyAddress, {
							magnitude: log.magnitude,
							effectBlock: log.effectBlock,
							createdAtBlock: BigInt(log.blockNumber),
							updatedAtBlock: BigInt(log.blockNumber),
							createdAt: log.blockTime,
							updatedAt: log.blockTime
						})
					}
				}
			}
		},
		10_000n
	)

	// Prepare DB transactions based on the composite map.
	const dbTransactions: any[] = []
	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avsAllocation.deleteMany())

		const newAllocations: {
			avsAddress: string
			operatorSetId: bigint
			operatorAddress: string
			strategyAddress: string
			magnitude: string
			effectBlock: bigint
			createdAtBlock: bigint
			updatedAtBlock: bigint
			createdAt: Date
			updatedAt: Date
		}[] = []

		for (const [operatorSetKey, operatorMap] of avsAllocationList) {
			const [avsAddress, operatorSetIdStr] = operatorSetKey.split('-')
			const operatorSetId = BigInt(operatorSetIdStr)
			for (const [operatorAddress, strategyMap] of operatorMap) {
				for (const [strategyAddress, record] of strategyMap) {
					newAllocations.push({
						avsAddress,
						operatorSetId,
						operatorAddress,
						strategyAddress,
						magnitude: record.magnitude,
						effectBlock: record.effectBlock,
						createdAtBlock: record.createdAtBlock,
						updatedAtBlock: record.updatedAtBlock,
						createdAt: record.createdAt,
						updatedAt: record.updatedAt
					})
				}
			}
		}

		dbTransactions.push(
			prismaClient.avsAllocation.createMany({
				data: newAllocations,
				skipDuplicates: true
			})
		)
	} else {
		for (const [operatorSetKey, operatorMap] of avsAllocationList) {
			const [avsAddress, operatorSetIdStr] = operatorSetKey.split('-')
			const operatorSetId = BigInt(operatorSetIdStr)
			for (const [operatorAddress, strategyMap] of operatorMap) {
				for (const [strategyAddress, record] of strategyMap) {
					dbTransactions.push(
						prismaClient.avsAllocation.upsert({
							where: {
								avsAddress_operatorSetId_operatorAddress_strategyAddress: {
									avsAddress,
									operatorSetId,
									operatorAddress,
									strategyAddress
								}
							},
							create: {
								avsAddress,
								operatorSetId,
								operatorAddress,
								strategyAddress,
								magnitude: record.magnitude,
								effectBlock: record.effectBlock,
								createdAtBlock: record.createdAtBlock,
								updatedAtBlock: record.updatedAtBlock,
								createdAt: record.createdAt,
								updatedAt: record.updatedAt
							},
							update: {
								magnitude: record.magnitude,
								effectBlock: record.effectBlock,
								updatedAtBlock: record.updatedAtBlock,
								updatedAt: record.updatedAt
							}
						})
					)
				}
			}
		}
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] AVS Allocation from: ${firstBlock} to: ${lastBlock} size: ${avsAllocationList.size}`
	)

	// Store the last synced block number.
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
