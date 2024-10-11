import { strategyAbi } from './data/abi/strategy'
import { getEigenContracts } from './data/address'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions, saveLastSyncBlock } from './utils/seeder'
import { getViemClient } from './utils/viemClient'

const blockSyncKey = 'lastSyncedBlock_strategies'

/**
 * Seed strategies data
 *
 * @param toBlock
 * @param fromBlock
 */
export async function seedStrategies(toBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const viemClient = getViemClient()

	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	const strategies = Object.values(getEigenContracts().Strategies)
	const strategyKeys = Object.keys(getEigenContracts().Strategies)

	await Promise.all(
		strategies.map(async (s, i) => {
			const strategyAddress = s.strategyContract.toLowerCase()
			let sharesToUnderlying = 1e18

			try {
				sharesToUnderlying = (await viemClient.readContract({
					address: strategyAddress,
					abi: strategyAbi,
					functionName: 'sharesToUnderlyingView',
					args: [1e18]
				})) as number
			} catch {}

			dbTransactions.push(
				prismaClient.strategies.upsert({
					where: {
						address: strategyAddress
					},
					create: {
						address: strategyAddress,
						symbol: strategyKeys[i],
						sharesToUnderlying: String(sharesToUnderlying),
						createdAtBlock: Number(lastBlock),
						updatedAtBlock: Number(lastBlock)
					},
					update: {
						symbol: strategyKeys[i],
						sharesToUnderlying: String(sharesToUnderlying),
						updatedAtBlock: Number(lastBlock)
					}
				})
			)
		})
	)

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Strategies updated at: ${lastBlock} size: ${dbTransactions.length}`
	)

	// Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
