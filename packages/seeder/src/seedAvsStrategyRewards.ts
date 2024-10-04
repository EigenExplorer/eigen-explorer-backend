import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_avsStrategyRewards'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_avsRewardsSubmission'

export async function seedAvsStrategyRewards(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const prismaClient = getPrismaClient()

	const avsStrategyRewardSubmissionList: Omit<
		prisma.AvsStrategyRewardSubmission,
		'id'
	>[] = []

	const existingAvs = await prismaClient.avs.findMany({
		select: { address: true }
	})
	const existingAvsSet = new Set(
		existingAvs.map((avs) => avs.address.toLowerCase())
	)

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock
		? toBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(
			`[In Sync] [Data] Avs Strategy Rewards from: ${firstBlock} to: ${lastBlock}`
		)
		return
	}

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await prismaClient.eventLogs_AVSRewardsSubmission.findMany({
			where: {
				blockNumber: {
					gt: fromBlock,
					lte: toBlock
				}
			}
		})

		for (const l in logs) {
			const log = logs[l]

			const totalAmount = log.rewardsSubmission_amount
			const multipliers = log.strategiesAndMultipliers_multipliers
			const distributedAmounts = distributeAmount(totalAmount, multipliers)

			for (const [
				index,
				strategy
			] of log.strategiesAndMultipliers_strategies.entries()) {
				const avsAddress = log.avs.toLowerCase()
				if (existingAvsSet.has(avsAddress)) {
					avsStrategyRewardSubmissionList.push({
						submissionNonce: log.submissionNonce,
						rewardsSubmissionHash: log.rewardsSubmissionHash,
						avsAddress,
						strategyAddress: strategy,
						multiplier: log.strategiesAndMultipliers_multipliers[index],
						token: log.rewardsSubmission_token,
						amount: distributedAmounts[index],
						startTimestamp: log.rewardsSubmission_startTimestamp,
						duration: log.rewardsSubmission_duration,
						createdAtBlock: log.blockNumber,
						createdAt: log.blockTime
					})
				}
			}
		}
	})

	// Prepare db transaction object
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (avsStrategyRewardSubmissionList.length > 0) {
		dbTransactions.push(
			prismaClient.avsStrategyRewardSubmission.createMany({
				data: avsStrategyRewardSubmissionList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Avs Strategy Rewards from: ${firstBlock} to: ${lastBlock} size: ${avsStrategyRewardSubmissionList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}

/**
 * Distributes a certain amount of tokens basis an array of relative weights
 * Returns an array with token amounts in corresponding indices
 *
 * @param totalAmount
 * @param multipliers
 * @returns
 */
function distributeAmount(
	totalAmount: prisma.Prisma.Decimal,
	multipliers: prisma.Prisma.Decimal[]
): prisma.Prisma.Decimal[] {
	const totalMultiplier = multipliers.reduce(
		(sum, m) => sum.add(m),
		new prisma.Prisma.Decimal(0)
	)
	return multipliers.map((multiplier) =>
		multiplier.mul(totalAmount).div(totalMultiplier)
	)
}
