import { erc20Abi, getContract } from 'viem'
import { strategyAbi } from './data/abi/strategy'
import { getPrismaClient } from './utils/prismaClient'
import { fetchLastSyncBlock, loopThroughBlocks } from './utils/seeder'
import { getViemClient } from './utils/viemClient'

const blockSyncKey = 'lastSyncedBlock_strategyWhitelist'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_strategyWhitelist'

/**
 * Seed strategy whitelist data
 *
 * @param toBlock
 * @param fromBlock
 */
export async function seedStrategyWhitelist(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Strategy Whitelist from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		let allLogs: any[] = []

		await prismaClient.eventLogs_StrategyAddedToDepositWhitelist
			.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
			.then((logs) => {
				allLogs = [
					...allLogs,
					...logs.map((log) => ({
						...log,
						eventName: 'StrategyAddedToDepositWhitelist'
					}))
				]
			})

		await prismaClient.eventLogs_StrategyRemovedFromDepositWhitelist
			.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
			.then((logs) => {
				allLogs = [
					...allLogs,
					...logs.map((log) => ({
						...log,
						eventName: 'StrategyRemovedFromDepositWhitelist'
					}))
				]
			})

		allLogs = allLogs.sort((a, b) => {
			if (a.blockNumber === b.blockNumber) {
				return a.transactionIndex - b.transactionIndex
			}

			return Number(a.blockNumber - b.blockNumber)
		})

		// Strategy list
		for (const l in allLogs) {
			const log = allLogs[l]
			const strategyAddress = String(log.strategy).toLowerCase()

			if (log.eventName === 'StrategyAddedToDepositWhitelist') {
				try {
					// Strategy contract
					const strategyContract = getContract({
						address: strategyAddress as `0x${string}`,
						abi: strategyAbi,
						client: getViemClient()
					})

					const underlyingToken = await strategyContract.read.underlyingToken()
					const sharesToUnderlying = await strategyContract.read.sharesToUnderlyingView([1e18])
					if (!underlyingToken) continue

					// Underlying token contract
					const underlyingTokenContract = getContract({
						address: underlyingToken as `0x${string}`,
						abi: erc20Abi,
						client: getViemClient()
					})

					const symbol = await underlyingTokenContract.read.symbol()
					const decimals = await underlyingTokenContract.read.decimals()
					const name = await underlyingTokenContract.read.name()

					await prismaClient.strategies.upsert({
						where: {
							address: strategyAddress
						},
						update: {
							updatedAtBlock: Number(lastBlock)
						},
						create: {
							address: strategyAddress,
							sharesToUnderlying: String(sharesToUnderlying),
							symbol: String(symbol),
							underlyingToken: String(underlyingToken),
							createdAtBlock: Number(lastBlock),
							updatedAtBlock: Number(lastBlock)
						}
					})

					await prismaClient.tokens.upsert({
						where: {
							address: String(underlyingToken)
						},
						update: {
							updatedAtBlock: Number(lastBlock)
						},
						create: {
							address: String(underlyingToken),
							symbol: String(symbol),
							name: String(name),
							decimals: Number(decimals),
							cmcId: 0,
							createdAtBlock: Number(lastBlock),
							updatedAtBlock: Number(lastBlock)
						}
					})
				} catch (error) {
					console.log('failed to add Strategy', strategyAddress, error)
				}
			} else if (log.eventName === 'StrategyRemovedFromDepositWhitelist') {
				await prismaClient.strategies.delete({ where: { address: strategyAddress } })
			}
		}
	})
}
