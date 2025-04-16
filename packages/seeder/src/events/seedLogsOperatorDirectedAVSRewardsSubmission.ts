import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	LogsUpdateMetadata,
	loopThroughBlocks
} from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorDirectedAvsRewardsSubmission'

export async function seedLogsOperatorDirectedAVSRewardsSubmission(
	toBlock?: bigint,
	fromBlock?: bigint
): Promise<LogsUpdateMetadata> {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	let isUpdated = false
	let updatedCount = 0

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)
		try {
			const dbTransactions: any[] = []
			const logsOperatorDirected: prisma.EventLogs_OperatorDirectedAVSRewardsSubmission[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().RewardsCoordinator,
				events: [
					parseAbiItem([
						'event OperatorDirectedAVSRewardsSubmissionCreated(address indexed caller, address indexed avs, bytes32 indexed operatorDirectedRewardsSubmissionHash, uint256 submissionNonce, OperatorDirectedRewardsSubmission operatorDirectedRewardsSubmission)',
						'struct OperatorDirectedRewardsSubmission { StrategyAndMultiplier[] strategiesAndMultipliers; address token; OperatorReward[] operatorRewards; uint32 startTimestamp; uint32 duration; string description; }',
						'struct StrategyAndMultiplier { address strategy; uint96 multiplier; }',
						'struct OperatorReward { address operator; uint256 amount; }'
					])
				],
				fromBlock,
				toBlock
			})

			for (const l in logs) {
				const log = logs[l]

				const strategies: string[] = []
				const multipliers: string[] = []
				const operatorRewardsOperators: string[] = []
				const operatorRewardsAmounts: string[] = []

				const ods = log.args.operatorDirectedRewardsSubmission

				// Process strategies and multipliers
				if (ods?.strategiesAndMultipliers) {
					for (const sm of ods.strategiesAndMultipliers) {
						strategies.push(sm.strategy)
						multipliers.push(sm.multiplier.toString())
					}
				}

				// Process operator rewards
				if (ods?.operatorRewards) {
					for (const orw of ods.operatorRewards) {
						operatorRewardsOperators.push(String(orw.operator))
						operatorRewardsAmounts.push(orw.amount.toString())
					}
				}

				logsOperatorDirected.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),

					caller: String(log.args.caller),
					avs: String(log.args.avs),
					submissionNonce: BigInt(log.args.submissionNonce || 0),
					operatorDirectedRewardsSubmissionHash: String(
						log.args.operatorDirectedRewardsSubmissionHash
					),

					operatorDirectedRewardsSubmission_token: String(ods?.token),
					operatorDirectedRewardsSubmission_startTimestamp: BigInt(ods?.startTimestamp || 0),
					operatorDirectedRewardsSubmission_duration: Number(ods?.duration),
					operatorDirectedRewardsSubmission_description: String(ods?.description),

					strategiesAndMultipliers_strategies: strategies,
					strategiesAndMultipliers_multipliers: multipliers,
					operatorRewards_operators: operatorRewardsOperators,
					operatorRewards_amounts: operatorRewardsAmounts
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorDirectedAVSRewardsSubmission.createMany({
					data: logsOperatorDirected,
					skipDuplicates: true
				})
			)

			// Store last synced block
			dbTransactions.push(
				prismaClient.settings.upsert({
					where: { key: blockSyncKeyLogs },
					update: { value: Number(toBlock) },
					create: { key: blockSyncKeyLogs, value: Number(toBlock) }
				})
			)

			// Update database
			const seedLength = logsOperatorDirected.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Operator Directed AVS Rewards Submission from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)

			isUpdated = true
			updatedCount += seedLength
		} catch {}
	})

	return {
		isUpdated,
		updatedCount
	}
}
