import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_completedWithdrawals'

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedCompletedWithdrawals(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	console.log('Seeding Completed Withdrawals ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const completedWithdrawalList: string[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().DelegationManager,
			event: parseAbiItem('event WithdrawalCompleted(bytes32 withdrawalRoot)'),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const withdrawalRoot = log.args.withdrawalRoot

			if (withdrawalRoot) {
				completedWithdrawalList.push(withdrawalRoot)
			}
		}

		console.log(
			`Withdrawals completed between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (completedWithdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.withdrawal.updateMany({
				where: { withdrawalRoot: { in: completedWithdrawalList } },
				data: {
					isCompleted: true
				}
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// // Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded Completed Withdrawals:', completedWithdrawalList.length)
}
