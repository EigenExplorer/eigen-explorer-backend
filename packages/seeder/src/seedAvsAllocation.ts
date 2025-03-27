import prisma from '@prisma/client'
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
	currentMagnitude: string
	pendingDiff: prisma.Prisma.Decimal
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

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs: any[] = await prismaClient.eventLogs_AllocationUpdated.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})

			logs.sort((a, b) => {
				if (a.blockNumber !== b.blockNumber) {
					return Number(a.blockNumber - b.blockNumber)
				}
				if (a.transactionIndex !== b.transactionIndex) {
					return Number(a.transactionIndex - b.transactionIndex)
				}
				return Number(a.effectBlock - b.effectBlock)
			})

			const allocationKeys = logs.map((log) => ({
				avsAddress: String(log.avs).toLowerCase(),
				operatorSetId: Number(log.operatorSetId),
				operatorAddress: String(log.operator).toLowerCase(),
				strategyAddress: String(log.strategy).toLowerCase()
			}))

			const existingAllocations =
				firstBlock !== baseBlock && allocationKeys.length > 0
					? await prismaClient.avsAllocation.findMany({
							where: {
								OR: allocationKeys.map((key) => ({
									avsAddress: key.avsAddress,
									operatorSetId: key.operatorSetId,
									operatorAddress: key.operatorAddress,
									strategyAddress: key.strategyAddress
								}))
							}
					  })
					: []

			for (const log of logs) {
				const avsAddress = String(log.avs).toLowerCase()
				const operatorSetId = Number(log.operatorSetId)
				const operatorAddress = String(log.operator).toLowerCase()
				const strategyAddress = String(log.strategy).toLowerCase()

				const outerKey = `${avsAddress}-${operatorSetId}`

				if (!avsAllocationList.has(outerKey)) {
					avsAllocationList.set(outerKey, new Map())
				}
				const operatorMap = avsAllocationList.get(outerKey)!

				if (!operatorMap.has(operatorAddress)) {
					operatorMap.set(operatorAddress, new Map())
				}
				const strategyMap = operatorMap.get(operatorAddress)!

				if (!strategyMap.has(strategyAddress)) {
					const existingAllocation = existingAllocations.find(
						(a) =>
							a.avsAddress.toLowerCase() === avsAddress &&
							a.operatorSetId === Number(operatorSetId) &&
							a.operatorAddress.toLowerCase() === operatorAddress &&
							a.strategyAddress.toLowerCase() === strategyAddress
					)

					const defaultRecord: AvsAllocationRecord = {
						currentMagnitude: '0',
						pendingDiff: new prisma.Prisma.Decimal(0),
						effectBlock: 0n,
						createdAtBlock: BigInt(log.blockNumber),
						updatedAtBlock: BigInt(log.blockNumber),
						createdAt: log.blockTime,
						updatedAt: log.blockTime
					}

					const record = existingAllocation
						? {
								currentMagnitude: existingAllocation.currentMagnitude,
								pendingDiff: new prisma.Prisma.Decimal(existingAllocation.pendingDiff),
								effectBlock: BigInt(existingAllocation.effectBlock),
								createdAtBlock: BigInt(existingAllocation.createdAtBlock),
								updatedAtBlock: BigInt(existingAllocation.updatedAtBlock),
								createdAt: existingAllocation.createdAt,
								updatedAt: existingAllocation.updatedAt
						  }
						: defaultRecord

					strategyMap.set(strategyAddress, record)
				}

				const record = strategyMap.get(strategyAddress)!

				if (log.effectBlock === log.blockNumber) {
					record.currentMagnitude = log.magnitude
					record.pendingDiff = new prisma.Prisma.Decimal(0)
					record.effectBlock = 0n
				} else {
					const currentMag = new prisma.Prisma.Decimal(record.currentMagnitude)
					const newMag = new prisma.Prisma.Decimal(log.magnitude)
					record.pendingDiff = newMag.minus(currentMag)
					record.effectBlock = BigInt(log.effectBlock)
				}
				record.updatedAtBlock = BigInt(log.blockNumber)
				record.updatedAt = log.blockTime
			}

			console.log(`[Batch] AVS Allocation from: ${fromBlock} to: ${toBlock}`)
		},
		10_000n
	)

	const dbTransactions: any[] = []
	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avsAllocation.deleteMany())
		const newAllocations: any[] = []
		for (const [outerKey, operatorMap] of avsAllocationList) {
			const [avsAddress, operatorSetId] = outerKey.split('-')
			for (const [operatorAddress, strategyMap] of operatorMap) {
				for (const [strategyAddress, record] of strategyMap) {
					newAllocations.push({
						avsAddress,
						operatorSetId: Number(operatorSetId),
						operatorAddress,
						strategyAddress,
						currentMagnitude: record.currentMagnitude.toString(),
						pendingDiff: record.pendingDiff,
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
			prismaClient.avsAllocation.createMany({ data: newAllocations, skipDuplicates: true })
		)
	} else {
		for (const [outerKey, operatorMap] of avsAllocationList) {
			const [avsAddress, operatorSetId] = outerKey.split('-')
			for (const [operatorAddress, strategyMap] of operatorMap) {
				for (const [strategyAddress, record] of strategyMap) {
					dbTransactions.push(
						prismaClient.avsAllocation.upsert({
							where: {
								avsAddress_operatorSetId_operatorAddress_strategyAddress: {
									avsAddress,
									operatorSetId: Number(operatorSetId),
									operatorAddress,
									strategyAddress
								}
							},
							create: {
								avsAddress,
								operatorSetId: Number(operatorSetId),
								operatorAddress,
								strategyAddress,
								currentMagnitude: record.currentMagnitude.toString(),
								pendingDiff: record.pendingDiff,
								effectBlock: record.effectBlock,
								createdAtBlock: record.createdAtBlock,
								updatedAtBlock: record.updatedAtBlock,
								createdAt: record.createdAt,
								updatedAt: record.updatedAt
							},
							update: {
								currentMagnitude: record.currentMagnitude.toString(),
								pendingDiff: record.pendingDiff,
								effectBlock: record.effectBlock
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
