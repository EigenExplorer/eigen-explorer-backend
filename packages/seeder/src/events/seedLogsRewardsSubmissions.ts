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

const blockSyncKeyLogs = 'lastSyncedBlock_logs_rewardsSubmissions'

type StrategyAndMultiplier = {
	strategy: `0x${string}`
	multiplier: prisma.Prisma.Decimal
}

type RewardsSubmission = {
	strategiesAndMultipliers: StrategyAndMultiplier[]
	token: `0x${string}`
	amount: prisma.Prisma.Decimal
	startTimestamp: bigint
	duration: number
}

interface BaseRewardsSubmissionEvent {
	submissionNonce: bigint
	rewardsSubmissionHash: `0x${string}`
	rewardsSubmission: RewardsSubmission
}

interface AVSRewardsSubmissionCreatedEvent extends BaseRewardsSubmissionEvent {
	avs: `0x${string}`
}

interface RewardsSubmissionForAllCreatedEvent
	extends BaseRewardsSubmissionEvent {
	submitter: `0x${string}`
}

type RewardsSubmissionEvent =
	| AVSRewardsSubmissionCreatedEvent
	| RewardsSubmissionForAllCreatedEvent

const sharedStructs = [
	'struct RewardsSubmission { StrategyAndMultiplier[] strategiesAndMultipliers; address token; uint256 amount; uint32 startTimestamp; uint32 duration; }',
	'struct StrategyAndMultiplier { address strategy; uint96 multiplier; }'
]

/**
 * Utility function to seed event logs
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedLogsRewardsSubmissions(
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

			const logsRewardsSubmissions: prisma.EventLogs_RewardsSubmissions[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().RewardsCoordinator,
				events: [
					parseAbiItem([
						'event AVSRewardsSubmissionCreated(address indexed avs, uint256 indexed submissionNonce, bytes32 indexed rewardsSubmissionHash, RewardsSubmission rewardsSubmission)',
						...sharedStructs
					]),
					parseAbiItem([
						'event RewardsSubmissionForAllCreated(address indexed submitter, uint256 indexed submissionNonce, bytes32 indexed rewardsSubmissionHash, RewardsSubmission rewardsSubmission)',
						...sharedStructs
					])
				],
				fromBlock,
				toBlock
			})

			// Setup a list containing event data
			for (const l in logs) {
				const log = logs[l]
				const type =
					log.eventName === 'AVSRewardsSubmissionCreated' ? 'avs' : 'global'

				const args = log.args as RewardsSubmissionEvent
				const address =
					type === 'avs'
						? String(
								(args as AVSRewardsSubmissionCreatedEvent).avs
						  ).toLowerCase()
						: String(
								(args as RewardsSubmissionForAllCreatedEvent).submitter
						  ).toLowerCase()

				const strategies: string[] = []
				const multipliers: prisma.Prisma.Decimal[] = []

				for (const strategyAndMultiplier of args.rewardsSubmission
					.strategiesAndMultipliers) {
					strategies.push(strategyAndMultiplier.strategy.toLowerCase())
					multipliers.push(
						new prisma.Prisma.Decimal(
							strategyAndMultiplier.multiplier.toString()
						)
					)
				}

				logsRewardsSubmissions.push({
					address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),
					type,
					submissionNonce: BigInt(args.submissionNonce),
					rewardsSubmissionHash: String(args.rewardsSubmissionHash),
					rewardsSubmission_token: String(
						args.rewardsSubmission.token
					).toLowerCase(),
					rewardsSubmission_amount: new prisma.Prisma.Decimal(
						args.rewardsSubmission.amount.toString()
					),
					rewardsSubmission_startTimestamp: BigInt(
						args.rewardsSubmission.startTimestamp
					),
					rewardsSubmission_duration: Number(args.rewardsSubmission.duration),
					strategiesAndMultipliers_strategies: strategies,
					strategiesAndMultipliers_multipliers: multipliers
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_RewardsSubmissions.createMany({
					data: logsRewardsSubmissions,
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
			const seedLength = logsRewardsSubmissions.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Rewards Submissions from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch (error) {
			console.log(error)
		}
	})
}
