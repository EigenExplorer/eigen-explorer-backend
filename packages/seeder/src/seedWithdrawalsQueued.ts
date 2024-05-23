import prisma from '@prisma/client'
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

const blockSyncKey = 'lastSyncedBlock_queuedWithdrawals'

interface Withdrawal {
	withdrawalRoot: string
	nonce: number
	isCompleted: boolean

	stakerAddress: string
	delegatedTo: string
	withdrawerAddress: string
	strategies: string[]
	shares: string[]
	startBlock: number

	createdAtBlock: number
	updatedAtBlock: number
}

/**
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedQueuedWithdrawals(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	console.log('Seeding Queued Withdrawals ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const queuedWithdrawalList: prisma.Withdrawal[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().DelegationManager,
			event: parseAbiItem([
				'event WithdrawalQueued(bytes32 withdrawalRoot, Withdrawal withdrawal)',
				'struct Withdrawal { address staker; address delegatedTo; address withdrawer; uint256 nonce; uint32 startBlock; address[] strategies; uint256[] shares; }'
			]),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			const withdrawalRoot = log.args.withdrawalRoot
			const withdrawal = log.args.withdrawal

			const blockNumber = BigInt(log.blockNumber)
			const block = await viemClient.getBlock({ blockNumber: blockNumber })
			const timestamp = new Date(Number(block.timestamp) * 1000)

			if (withdrawalRoot && withdrawal) {
				const stakerAddress = withdrawal.staker.toLowerCase()
				const delegatedTo = withdrawal.delegatedTo.toLowerCase()
				const withdrawerAddress = withdrawal.withdrawer.toLowerCase()

				queuedWithdrawalList.push({
					withdrawalRoot,
					nonce: Number(withdrawal.nonce),
					isCompleted: false,
					stakerAddress,
					delegatedTo,
					withdrawerAddress,
					strategies: withdrawal.strategies.map((s) =>
						s.toLowerCase()
					) as string[],
					shares: withdrawal.shares.map((s) => BigInt(s).toString()),

					startBlock: BigInt(withdrawal.startBlock),
					createdAtBlock: blockNumber,
					updatedAtBlock: blockNumber,
					createdAt: timestamp,
					updatedAt: timestamp
				})
			}
		}

		console.log(
			`Withdrawals queued between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (queuedWithdrawalList.length > 0) {
		dbTransactions.push(
			prismaClient.withdrawal.createMany({
				data: queuedWithdrawalList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// // Storing last sycned block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded Queued Withdrawals:', queuedWithdrawalList.length)
}
