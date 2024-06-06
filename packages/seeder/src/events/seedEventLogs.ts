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

const blockSyncKey = 'lastSyncedBlock_logs'

export interface TransactionLog {
	address: string
	transactionHash: string
	transactionIndex: number
	blockNumber: bigint
	blockHash: string
	blockTime: Date
}

/**
 * Utility function to seed logs for 8 events
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedEventLogs(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding Event Logs ...')

	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const logsAVSMetadataURIUpdated: prisma.EventLogs_AVSMetadataURIUpdated[] = []
	const logsOperatorMetadataURIUpdated: prisma.EventLogs_OperatorMetadataURIUpdated[] =
		[]
	const logsOperatorAVSRegistrationStatusUpdated: prisma.EventLogs_OperatorAVSRegistrationStatusUpdated[] =
		[]
	const logsPodDeployed: prisma.EventLogs_PodDeployed[] = []
	const logsOperatorSharesDecreased: prisma.EventLogs_OperatorSharesDecreased[] =
		[]
	const logsOperatorSharesIncreased: prisma.EventLogs_OperatorSharesIncreased[] =
		[]
	const logsStakerDelegated: prisma.EventLogs_StakerDelegated[] = []
	const logsStakerUndelegated: prisma.EventLogs_StakerUndelegated[] = []
	const logsDeposit: prisma.EventLogs_Deposit[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()
	const blockData = await getBlockDataFromDb(firstBlock, lastBlock)

	// Loop through evm logs for all 8 events from 3 contracts
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []

		try {
			const logs = await viemClient.getLogs({
				address: [
					getEigenContracts().AVSDirectory,
					getEigenContracts().DelegationManager,
					getEigenContracts().EigenPodManager
				],
				events: [
					parseAbiItem(
						'event AVSMetadataURIUpdated(address indexed avs, string metadataURI)'
					),
					parseAbiItem(
						'event OperatorAVSRegistrationStatusUpdated(address indexed operator, address indexed avs, uint8 status)'
					),
					parseAbiItem(
						'event OperatorMetadataURIUpdated(address indexed operator, string metadataURI)'
					),
					parseAbiItem(
						'event OperatorSharesIncreased(address indexed operator, address staker, address strategy, uint256 shares)'
					),
					parseAbiItem(
						'event OperatorSharesDecreased(address indexed operator, address staker, address strategy, uint256 shares)'
					),
					parseAbiItem(
						'event PodDeployed(address indexed eigenPod, address indexed podOwner)'
					),
					parseAbiItem(
						'event StakerDelegated(address indexed staker, address indexed operator)'
					),
					parseAbiItem(
						'event StakerUndelegated(address indexed staker, address indexed operator)'
					),
					parseAbiItem(
						'event Deposit(address staker, address token, address strategy, uint256 shares)'
					)
				],
				fromBlock,
				toBlock
			})

			// For each event, setup different lists containing event data
			for (const l in logs) {
				const log = logs[l]

				const transactionData: TransactionLog = {
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.transactionIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0)
				}

				switch (log.eventName) {
					case 'AVSMetadataURIUpdated': {
						logsAVSMetadataURIUpdated.push({
							...transactionData,
							avs: String(log.args.avs),
							metadataURI: String(log.args.metadataURI)
						})
						break
					}

					case 'OperatorAVSRegistrationStatusUpdated': {
						logsOperatorAVSRegistrationStatusUpdated.push({
							...transactionData,
							operator: String(log.args.operator),
							avs: String(log.args.avs),
							status: Number(log.args.status)
						})
						break
					}

					case 'OperatorMetadataURIUpdated': {
						logsOperatorMetadataURIUpdated.push({
							...transactionData,
							operator: String(log.args.operator),
							metadataURI: String(log.args.metadataURI)
						})
						break
					}

					case 'OperatorSharesIncreased': {
						logsOperatorSharesIncreased.push({
							...transactionData,
							operator: String(log.args.operator),
							staker: String(log.args.staker),
							strategy: String(log.args.strategy),
							shares: String(log.args.shares)
						})
						break
					}

					case 'OperatorSharesDecreased': {
						logsOperatorSharesDecreased.push({
							...transactionData,
							operator: String(log.args.operator),
							staker: String(log.args.staker),
							strategy: String(log.args.strategy),
							shares: String(log.args.shares)
						})
						break
					}

					case 'PodDeployed': {
						logsPodDeployed.push({
							...transactionData,
							eigenPod: String(log.args.eigenPod),
							podOwner: String(log.args.podOwner)
						})
						break
					}

					case 'StakerDelegated': {
						logsStakerDelegated.push({
							...transactionData,
							staker: String(log.args.staker),
							operator: String(log.args.operator)
						})
						break
					}

					case 'StakerUndelegated': {
						logsStakerUndelegated.push({
							...transactionData,
							staker: String(log.args.staker),
							operator: String(log.args.operator)
						})
						break
					}

					case 'Deposit': {
						logsDeposit.push({
							...transactionData,
							staker: String(log.args.staker),
							token: String(log.args.token),
							strategy: String(log.args.strategy),
							shares: String(log.args.shares)
						})
					}
				}
			}

			// Update logs to the database

			dbTransactions.push(
				prismaClient.eventLogs_AVSMetadataURIUpdated.createMany({
					data: logsAVSMetadataURIUpdated,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_OperatorMetadataURIUpdated.createMany({
					data: logsOperatorMetadataURIUpdated,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.createMany({
					data: logsOperatorAVSRegistrationStatusUpdated,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_OperatorSharesDecreased.createMany({
					data: logsOperatorSharesDecreased,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_OperatorSharesIncreased.createMany({
					data: logsOperatorSharesIncreased,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_StakerDelegated.createMany({
					data: logsStakerDelegated,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_StakerUndelegated.createMany({
					data: logsStakerUndelegated,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.eventLogs_Deposit.createMany({
					data: logsDeposit,
					skipDuplicates: true
				})
			)

			// Store last synced block
			dbTransactions.push(
				prismaClient.settings.upsert({
					where: { key: blockSyncKey },
					update: { value: Number(toBlock) },
					create: { key: blockSyncKey, value: Number(toBlock) }
				})
			)

			await bulkUpdateDbTransactions(dbTransactions)

			console.log(
				`Event logs registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
			)
		} catch (error) {}
	})
}
