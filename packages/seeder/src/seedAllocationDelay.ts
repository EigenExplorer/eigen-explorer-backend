import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operatorAllocationDelay'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorAllocationDelay'

type AllocationDelayRecord = {
	delay: bigint
	effectBlock: bigint
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

export async function seedAllocationDelay(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ?? (await fetchLastSyncBlock(blockSyncKey))
	const lastBlock = toBlock ?? (await fetchLastSyncBlock(blockSyncKeyLogs))

	// Bail early if there is no block diff to sync
	if (lastBlock <= firstBlock) {
		console.log(`[In Sync] [Data] Allocation Delay from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const allocationDelaysList: Map<string, AllocationDelayRecord> = new Map()

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_AllocationDelaySet.findMany({
				where: {
					blockNumber: {
						gt: fromBlock,
						lte: toBlock
					}
				}
			})

			const operatorAddresses = logs.map((l) => String(l.operator).toLowerCase())
			const existingOperators = new Set(operatorAddresses)

			// Process each log.
			for (const log of logs) {
				const operatorAddress = String(log.operator).toLowerCase()

				if (existingOperators.has(operatorAddress)) {
					const delay = BigInt(log.delay)
					const effectBlock = BigInt(log.effectBlock)

					if (allocationDelaysList.has(operatorAddress)) {
						const existingRecord = allocationDelaysList.get(operatorAddress)

						if (existingRecord) {
							// AllocationDelay has been set before in this fetch
							const updatedRecord: AllocationDelayRecord = {
								delay,
								effectBlock,
								createdAtBlock: existingRecord.createdAtBlock,
								updatedAtBlock: log.blockNumber,
								createdAt: existingRecord.createdAt,
								updatedAt: log.blockTime
							}
							allocationDelaysList.set(operatorAddress, updatedRecord)
						}
					} else {
						const newRecord: AllocationDelayRecord = {
							delay,
							effectBlock,
							createdAtBlock: log.blockNumber,
							updatedAtBlock: log.blockNumber,
							createdAt: log.blockTime,
							updatedAt: log.blockTime
						}
						allocationDelaysList.set(operatorAddress, newRecord)
					}
				}
			}
		},
		10_000n
	)

	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.allocationDelay.deleteMany())

		const newAllocationDelay: {
			operatorAddress: string
			delay: bigint
			effectBlock: bigint
			createdAtBlock: bigint
			updatedAtBlock: bigint
			createdAt: Date
			updatedAt: Date
		}[] = []

		for (const [operatorAddress, record] of allocationDelaysList) {
			newAllocationDelay.push({
				operatorAddress,
				delay: record.delay,
				effectBlock: record.effectBlock,
				createdAtBlock: record.createdAtBlock,
				updatedAtBlock: record.updatedAtBlock,
				createdAt: record.createdAt,
				updatedAt: record.updatedAt
			})
		}

		dbTransactions.push(
			prismaClient.allocationDelay.createMany({
				data: newAllocationDelay,
				skipDuplicates: true
			})
		)
	} else {
		for (const [operatorAddress, record] of allocationDelaysList) {
			dbTransactions.push(
				prismaClient.allocationDelay.upsert({
					where: { operatorAddress },
					create: {
						operatorAddress,
						delay: record.delay,
						effectBlock: record.effectBlock,
						createdAtBlock: record.createdAtBlock,
						updatedAtBlock: record.updatedAtBlock,
						createdAt: record.createdAt,
						updatedAt: record.updatedAt
					},
					update: {
						delay: record.delay,
						effectBlock: record.effectBlock,
						updatedAtBlock: record.updatedAtBlock,
						updatedAt: record.updatedAt
					}
				})
			)
		}
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Allocation Delay from: ${firstBlock} to: ${lastBlock} size: ${allocationDelaysList.size}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
