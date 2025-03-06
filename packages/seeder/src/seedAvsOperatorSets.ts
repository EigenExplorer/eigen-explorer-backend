import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avsOperatorSetOperators'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_avsOperatorSetOperators'

type AvsOperatorSetRecord = {
	registered: boolean
	slashableUntil: bigint
	createdAtBlock: bigint
	updatedAtBlock: bigint
	createdAt: Date
	updatedAt: Date
}

const DEFAULT_DEALLOCATION_DELAY = {
	mainnet: '100800',
	holesky: '50'
}

export async function seedAvsOperatorSets(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	// (avsAddress-operatorSetId) => operatorAddress => AvsOperatorSetRecord
	const avsOperatorSetList: Map<string, Map<string, AvsOperatorSetRecord>> = new Map()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] AVS OperatorSet Operators from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const avsOperatorSet = await prismaClient.operatorSet.findMany({
		select: { avsAddress: true, operatorSetId: true }
	})

	avsOperatorSet.map((a) => avsOperatorSetList.set(`${a.avsAddress}-${a.operatorSetId}`, new Map()))

	const dellocationDelayBlocks = (await getPrismaClient().settings.findUnique({
		where: { key: 'dellocationDelayBlocks' }
	})) ?? {
		value:
			DEFAULT_DEALLOCATION_DELAY[process.env.NETWORK as keyof typeof DEFAULT_DEALLOCATION_DELAY]
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			let allLogs: any[] = []

			await prismaClient.eventLogs_OperatorAddedToOperatorSet
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [
						...allLogs,
						...logs.map((log) => ({
							...log,
							eventName: 'OperatorAddedToOperatorSet'
						}))
					]
				})

			await prismaClient.eventLogs_OperatorRemovedFromOperatorSet
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [
						...allLogs,
						...logs.map((log) => ({
							...log,
							eventName: 'OperatorRemovedFromOperatorSet'
						}))
					]
				})

			allLogs = allLogs.sort((a, b) => {
				if (a.blockNumber === b.blockNumber) {
					return a.transactionIndex - b.transactionIndex
				}
				return Number(a.blockNumber - b.blockNumber)
			})

			for (const log of allLogs) {
				const avsAddress = String(log.avs).toLowerCase()
				const operatorSetId = Number(log.operatorSetId)
				const operatorAddress = String(log.operator).toLowerCase()

				const operatorSetKey = `${avsAddress}-${operatorSetId}`

				const registered = log.eventName === 'OperatorAddedToOperatorSet'

				const slashableUntil = registered
					? 0n
					: log.blockNumber + BigInt(String(dellocationDelayBlocks.value))

				if (avsOperatorSetList.has(operatorSetKey)) {
					const operatorMap = avsOperatorSetList.get(operatorSetKey)

					if (operatorMap?.has(operatorAddress)) {
						const existingRecord = operatorMap.get(operatorAddress)
						if (existingRecord) {
							operatorMap.set(operatorAddress, {
								registered,
								slashableUntil,
								createdAtBlock: existingRecord.createdAtBlock,
								updatedAtBlock: log.blockNumber,
								createdAt: existingRecord.createdAt,
								updatedAt: log.blockTime
							})
						}
					} else {
						operatorMap?.set(operatorAddress, {
							registered,
							slashableUntil,
							createdAtBlock: log.blockNumber,
							updatedAtBlock: log.blockNumber,
							createdAt: log.blockTime,
							updatedAt: log.blockTime
						})
					}
				}
			}
		},
		10_000n
	)

	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.avsOperatorSet.deleteMany())

		const newAvsOperators: {
			avsAddress: string
			operatorSetId: number
			operatorAddress: string
			registered: boolean
			slashableUntil: bigint
			createdAtBlock: bigint
			updatedAtBlock: bigint
			createdAt: Date
			updatedAt: Date
		}[] = []

		for (const [operatorSetKey, operatorMap] of avsOperatorSetList) {
			const [avsAddress, operatorSetIdStr] = operatorSetKey.split('-')
			const operatorSetId = Number(operatorSetIdStr)
			for (const [operatorAddress, record] of operatorMap) {
				newAvsOperators.push({
					avsAddress,
					operatorSetId,
					operatorAddress,
					registered: record.registered,
					slashableUntil: record.slashableUntil,
					createdAtBlock: record.createdAtBlock,
					updatedAtBlock: record.updatedAtBlock,
					createdAt: record.createdAt,
					updatedAt: record.updatedAt
				})
			}
		}

		dbTransactions.push(
			prismaClient.avsOperatorSet.createMany({
				data: newAvsOperators,
				skipDuplicates: true
			})
		)
	} else {
		for (const [operatorSetKey, operatorMap] of avsOperatorSetList) {
			const [avsAddress, operatorSetIdStr] = operatorSetKey.split('-')
			const operatorSetId = Number(operatorSetIdStr)

			for (const [operatorAddress, record] of operatorMap) {
				dbTransactions.push(
					prismaClient.avsOperatorSet.upsert({
						where: {
							avsAddress_operatorSetId_operatorAddress: {
								avsAddress,
								operatorSetId,
								operatorAddress
							}
						},
						create: {
							avsAddress,
							operatorSetId,
							operatorAddress,
							registered: record.registered,
							slashableUntil: record.slashableUntil,
							createdAtBlock: record.createdAtBlock,
							updatedAtBlock: record.updatedAtBlock,
							createdAt: record.createdAt,
							updatedAt: record.updatedAt
						},
						update: {
							registered: record.registered,
							slashableUntil: record.slashableUntil,
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
		`[Data] AVS OperatorSet Operators from: ${firstBlock} to: ${lastBlock} size: ${avsOperatorSetList.size}`
	)

	// Store the last synced block number.
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
