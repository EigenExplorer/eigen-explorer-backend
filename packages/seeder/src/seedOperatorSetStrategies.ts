import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operatorSetStrategies'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorSetStrategies'

export async function seedOperatorSetStrategies(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	const existingSets = await prismaClient.operatorSet.findMany({
		select: {
			avsAddress: true,
			operatorSetId: true,
			strategies: true
		}
	})

	const operatorSetMap: Map<string, Set<string>> = new Map()
	for (const os of existingSets) {
		const key = `${os.avsAddress.toLowerCase()}-${os.operatorSetId}`
		operatorSetMap.set(key, new Set(os.strategies || []))
	}

	const firstBlock = fromBlock ?? (await fetchLastSyncBlock(blockSyncKey))
	const lastBlock = toBlock ?? (await fetchLastSyncBlock(blockSyncKeyLogs))
	if (lastBlock - firstBlock <= 0n) {
		console.log(`[In Sync] [Data] OperatorSet Strategies from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	const combinedLogs: any[] = []

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			const addedLogs = await prismaClient.eventLogs_StrategyAddedToOperatorSet.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})
			for (const log of addedLogs) {
				combinedLogs.push({
					eventName: 'StrategyAddedToOperatorSet',
					avs: log.avs.toLowerCase(),
					operatorSetId: BigInt(log.operatorSetId),
					strategy: log.strategy.toLowerCase(),
					blockNumber: BigInt(log.blockNumber),
					transactionIndex: log.transactionIndex,
					blockTime: log.blockTime
				})
			}

			const removedLogs = await prismaClient.eventLogs_StrategyRemovedFromOperatorSet.findMany({
				where: { blockNumber: { gt: fromBlock, lte: toBlock } }
			})
			for (const log of removedLogs) {
				combinedLogs.push({
					eventName: 'StrategyRemovedFromOperatorSet',
					avs: log.avs.toLowerCase(),
					operatorSetId: BigInt(log.operatorSetId),
					strategy: log.strategy.toLowerCase(),
					blockNumber: BigInt(log.blockNumber),
					transactionIndex: log.transactionIndex,
					blockTime: log.blockTime
				})
			}
		},
		10_000n
	)

	combinedLogs.sort((a, b) => {
		if (a.blockNumber === b.blockNumber) {
			return a.transactionIndex - b.transactionIndex
		}
		return Number(a.blockNumber - b.blockNumber)
	})

	for (const log of combinedLogs) {
		const key = `${log.avs}-${log.operatorSetId}`
		const strategiesSet = operatorSetMap.get(key)

		if (strategiesSet) {
			if (log.eventName === 'StrategyAddedToOperatorSet') {
				strategiesSet.add(log.strategy.toLowerCase())
			} else if (log.eventName === 'StrategyRemovedFromOperatorSet') {
				strategiesSet.delete(log.strategy.toLowerCase())
			}
		}
	}

	const dbTransactions: any[] = []
	for (const [key, strategiesSet] of operatorSetMap.entries()) {
		const [avsAddress, operatorSetIdStr] = key.split('-')
		const operatorSetId = BigInt(operatorSetIdStr)
		const strategiesArray = Array.from(strategiesSet)
		dbTransactions.push(
			prismaClient.operatorSet.updateMany({
				where: { avsAddress, operatorSetId },
				data: { strategies: strategiesArray }
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] OperatorSet Strategies from: ${firstBlock} to: ${lastBlock} size: ${operatorSetMap.size}`
	)

	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
