import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from './data/address'
import { getViemClient } from './utils/viemClient'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_deposit'

interface DepositEntryRecord {
	txHash: string
	staker: string
	token: string
	strategy: string
	shares: string
	blockNumber: bigint
	timestamp: Date
}

/**
 * Utility function to seed deposits from Deposit events emmited by StrategyManager
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedDeposits(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding Deposits ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()
	const depositList: DepositEntryRecord[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await viemClient.getLogs({
			address: getEigenContracts().StrategyManager,
			event: parseAbiItem(
				'event Deposit(address staker, address token, address strategy, uint256 shares)'
			),
			fromBlock,
			toBlock
		})

		for (const l in logs) {
			const log = logs[l]

			try {
				const blockNumber = BigInt(log.blockNumber)
				const block = await viemClient.getBlock({ blockNumber: blockNumber })
				const timestamp = new Date(Number(block.timestamp) * 1000)

				depositList.push({
					txHash: String(log.transactionHash).toLowerCase(),
					staker: String(log.args.staker).toLowerCase(),
					token: String(log.args.token).toLowerCase(),
					strategy: String(log.args.strategy).toLowerCase(),
					shares: String(log.args.shares),
					blockNumber: blockNumber,
					timestamp: timestamp
				})
			} catch (error) {
				console.log('Failed to seed deposit: ', error)
			}
		}

		console.log(
			`Deposits registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.deposit.deleteMany())

		const newDeposit: prisma.Deposit[] = []

		for (const {
			txHash,
			staker,
			token,
			strategy,
			shares,
			blockNumber,
			timestamp
		} of depositList) {
			newDeposit.push({
				txHash,
				staker,
				token,
				strategy,
				shares,
				blockNumber,
				timestamp
			})
		}

		dbTransactions.push(
			prismaClient.deposit.createMany({
				data: newDeposit,
				skipDuplicates: true
			})
		)
	} else {
		for (const {
			txHash,
			staker,
			token,
			strategy,
			shares,
			blockNumber,
			timestamp
		} of depositList) {
			dbTransactions.push(
				prismaClient.deposit.upsert({
					where: { txHash },
					update: {},
					create: {
						txHash,
						staker,
						token,
						strategy,
						shares,
						blockNumber,
						timestamp
					}
				})
			)
		}
	}

	await bulkUpdateDbTransactions(dbTransactions)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded Deposits:', depositList.length)
}
