import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avsOperators'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_avsOperators'

type AvsOperatorRecord = {
	status: number
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

export async function seedAvsOperators(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const avsOperatorsList: Map<string, Map<string, AvsOperatorRecord>> = new Map()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] AVS Operators from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	// Load initial operator staker state
	const avs = await prismaClient.avs.findMany({
		select: { address: true }
	})

	avs.map((a) => avsOperatorsList.set(a.address, new Map()))

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const logs = await prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.findMany({
				where: {
					blockNumber: {
						gt: fromBlock,
						lte: toBlock
					}
				}
			})

			for (const l in logs) {
				const log = logs[l]

				const avsAddress = String(log.avs).toLowerCase()
				const operatorAddress = String(log.operator).toLowerCase()

				if (avsOperatorsList.has(avsAddress)) {
					const operatorMap = avsOperatorsList.get(avsAddress)

					if (operatorMap?.has(operatorAddress)) {
						const existingRecord = operatorMap.get(operatorAddress)

						if (existingRecord) {
							// AvsOperator has been registered before in this fetch
							const updatedRecord: AvsOperatorRecord = {
								status: log.status || 0,
								createdAtBlock: existingRecord.createdAtBlock,
								updatedAtBlock: log.blockNumber,
								createdAt: existingRecord.createdAt,
								updatedAt: log.blockTime
							}
							operatorMap.set(operatorAddress, updatedRecord)
						}
					} else {
						// AvsOperator being registered for the first time in this fetch
						// createdAt & createdAtBlock will be omitted in upsert if avs<>operator already exists in db
						const newRecord: AvsOperatorRecord = {
							status: log.status || 0,
							createdAtBlock: log.blockNumber,
							updatedAtBlock: log.blockNumber,
							createdAt: log.blockTime,
							updatedAt: log.blockTime
						}
						operatorMap?.set(operatorAddress, newRecord)
					}
				}
			}
		},
		10_000n
	)

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avsOperator.deleteMany())

		const newAvsOperator: {
			avsAddress: string
			operatorAddress: string
			isActive: boolean
			createdAtBlock: bigint
			updatedAtBlock: bigint
			createdAt: Date
			updatedAt: Date
		}[] = []

		for (const [avsAddress, operatorsMap] of avsOperatorsList) {
			for (const [operatorAddress, record] of operatorsMap) {
				newAvsOperator.push({
					operatorAddress,
					avsAddress,
					isActive: record.status === 1,
					createdAtBlock: record.createdAtBlock,
					updatedAtBlock: record.updatedAtBlock,
					createdAt: record.createdAt,
					updatedAt: record.updatedAt
				})
			}
		}

		dbTransactions.push(
			prismaClient.avsOperator.createMany({
				data: newAvsOperator,
				skipDuplicates: true
			})
		)
	} else {
		for (const [avsAddress, operatorsMap] of avsOperatorsList) {
			for (const [operatorAddress, record] of operatorsMap) {
				dbTransactions.push(
					prismaClient.avsOperator.upsert({
						where: {
							avsAddress_operatorAddress: { avsAddress, operatorAddress }
						},
						create: {
							operatorAddress,
							avsAddress,
							isActive: record.status === 1,
							createdAtBlock: record.createdAtBlock,
							updatedAtBlock: record.updatedAtBlock,
							createdAt: record.createdAt,
							updatedAt: record.updatedAt
						},
						update: {
							isActive: record.status === 1,
							updatedAtBlock: record.updatedAtBlock,
							updatedAt: record.updatedAt
						}
					})
				)
			}
		}
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] AVS Operator from: ${firstBlock} to: ${lastBlock} size: ${avsOperatorsList.size}`
	)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
