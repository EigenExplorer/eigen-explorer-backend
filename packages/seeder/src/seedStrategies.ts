import { strategyAbi } from './data/abi/strategy'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions, saveLastSyncBlock } from './utils/seeder'
import { getViemClient } from './utils/viemClient'

const blockSyncKey = 'lastSyncedBlock_strategies'

/**
 * Seed strategies data to update sharesToUnderlying
 *
 * @param toBlock
 * @param fromBlock
 */
export async function seedStrategies(toBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const viemClient = getViemClient()

	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()
	const strategies = await prismaClient.strategies.findMany()

	// Prepare db transaction object
	const dbTransactions: any[] = []

	for (const s of strategies) {
		const strategyAddress = s.address.toLowerCase()
		let sharesToUnderlying = s.sharesToUnderlying || 1e18

		try {
			sharesToUnderlying = (await viemClient.readContract({
				address: strategyAddress as `0x${string}`,
				abi: strategyAbi,
				functionName: 'sharesToUnderlyingView',
				args: [1e18]
			})) as number
		} catch {}

		dbTransactions.push(
			prismaClient.strategies.update({
				where: {
					address: strategyAddress
				},
				data: {
					sharesToUnderlying: String(sharesToUnderlying),
					updatedAtBlock: Number(lastBlock)
				}
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Strategies updated at: ${lastBlock} size: ${dbTransactions.length}`
	)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
