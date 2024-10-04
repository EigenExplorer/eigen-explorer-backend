import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	loopThroughBlocks
} from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_avsRewardsSubmission'

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsAVSRewardsSubmission(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)
		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			const logsAvsRewardsSubmissions: prisma.EventLogs_AVSRewardsSubmission[] =
				[]

			const logs = await viemClient.getLogs({
				address: getEigenContracts().RewardsCoordinator,
				events: [
					parseAbiItem([
						'event AVSRewardsSubmissionCreated(address indexed avs, uint256 indexed submissionNonce, bytes32 indexed rewardsSubmissionHash, RewardsSubmission rewardsSubmission)',
						'struct RewardsSubmission { StrategyAndMultiplier[] strategiesAndMultipliers; address token; uint256 amount; uint32 startTimestamp; uint32 duration; }',
						'struct StrategyAndMultiplier { address strategy; uint96 multiplier; }'
					])
				],
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]

				const strategies: string[] = []
				const multipliers: prisma.Prisma.Decimal[] = []

				if (log.args.rewardsSubmission?.strategiesAndMultipliers) {
					for (const strategyAndMultiplier of log.args.rewardsSubmission
						.strategiesAndMultipliers) {
						strategies.push(strategyAndMultiplier.strategy.toLowerCase())
						multipliers.push(
							new prisma.Prisma.Decimal(
								strategyAndMultiplier.multiplier.toString()
							)
						)
					}

					logsAvsRewardsSubmissions.push({
						address: log.address.toLowerCase(),
						transactionHash: log.transactionHash.toLowerCase(),
						transactionIndex: log.logIndex,
						blockNumber: BigInt(log.blockNumber),
						blockHash: log.blockHash.toLowerCase(),
						blockTime: blockData.get(log.blockNumber) || new Date(0),
						avs: String(log.args.avs).toLowerCase(),
						submissionNonce: BigInt(log.args.submissionNonce || 0),
						rewardsSubmissionHash: String(
							log.args.rewardsSubmissionHash
						).toLowerCase(),
						rewardsSubmission_token: String(
							log.args.rewardsSubmission.token
						).toLowerCase(),
						rewardsSubmission_amount: new prisma.Prisma.Decimal(
							log.args.rewardsSubmission.amount.toString()
						),
						rewardsSubmission_startTimestamp: BigInt(
							log.args.rewardsSubmission.startTimestamp
						),
						rewardsSubmission_duration: Number(
							log.args.rewardsSubmission.duration
						),
						strategiesAndMultipliers_strategies: strategies,
						strategiesAndMultipliers_multipliers: multipliers
					})
				}
			}

			dbTransactions.push(
				prismaClient.eventLogs_AVSRewardsSubmission.createMany({
					data: logsAvsRewardsSubmissions,
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
			const seedLength = logsAvsRewardsSubmissions.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] AVS Rewards Submission from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {
			console.log(error)
		}
	})
}
