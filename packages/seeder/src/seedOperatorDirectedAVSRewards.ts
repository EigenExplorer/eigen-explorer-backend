import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'
import { distributeAmount } from './utils/amounts'

const blockSyncKey = 'lastSyncedBlock_operatorDirectedAvsRewards'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorDirectedAvsRewardsSubmission'

export async function seedOperatorDirectedAvsRewards(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const operatorDirectedRewardSubmissionList: Omit<
		prisma.OperatorDirectedAvsStrategyRewardsSubmission,
		'id'
	>[] = []

	const existingAvs = await prismaClient.avs.findMany({ select: { address: true } })
	const existingAvsSet = new Set(existingAvs.map((avs) => avs.address.toLowerCase()))

	const existingOperators = await prismaClient.operator.findMany({ select: { address: true } })
	const existingOperatorsSet = new Set(existingOperators.map((op) => op.address.toLowerCase()))

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(
			`[In Sync] [Data] Operator Directed Avs Strategy Rewards from: ${firstBlock} to: ${lastBlock}`
		)
		return
	}

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await prismaClient.eventLogs_OperatorDirectedAVSRewardsSubmission.findMany({
			where: {
				blockNumber: {
					gt: fromBlock,
					lte: toBlock
				}
			}
		})

		for (const log of logs) {
			const avsAddress = log.avs.toLowerCase()
			if (!existingAvsSet.has(avsAddress)) {
				continue
			}

			const operators = log.operatorRewards_operators || []
			const amounts = log.operatorRewards_amounts || []

			// Ensure operators and amounts arrays match in length
			if (operators.length === 0 || amounts.length !== operators.length) {
				continue
			}

			for (let i = 0; i < operators.length; i++) {
				const operatorAddress = operators[i].toLowerCase()

				if (!existingOperatorsSet.has(operatorAddress)) {
					continue
				}

				const totalAmount = new prisma.Prisma.Decimal(amounts[i])
				const multipliers = log.strategiesAndMultipliers_multipliers
				const distributedAmounts = distributeAmount(totalAmount, multipliers)

				for (const [index, strategy] of log.strategiesAndMultipliers_strategies.entries()) {
					operatorDirectedRewardSubmissionList.push({
						submissionNonce: log.submissionNonce,
						operatorDirectedRewardsSubmissionHash: log.operatorDirectedRewardsSubmissionHash,
						avsAddress,
						operatorAddress,
						strategyAddress: strategy,
						multiplier: new prisma.Prisma.Decimal(log.strategiesAndMultipliers_multipliers[index]),
						token: log.operatorDirectedRewardsSubmission_token,
						amount: distributedAmounts[index],
						startTimestamp: log.operatorDirectedRewardsSubmission_startTimestamp,
						duration: log.operatorDirectedRewardsSubmission_duration,
						description: log.operatorDirectedRewardsSubmission_description,
						createdAtBlock: log.blockNumber,
						createdAt: log.blockTime
					})
				}
			}
		}
	})

	// Prepare db transaction object
	const dbTransactions: any[] = []

	if (operatorDirectedRewardSubmissionList.length > 0) {
		dbTransactions.push(
			prismaClient.operatorDirectedAvsStrategyRewardsSubmission.createMany({
				data: operatorDirectedRewardSubmissionList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Operator Directed Avs Strategy Rewards from: ${firstBlock} to: ${lastBlock} size: ${operatorDirectedRewardSubmissionList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
