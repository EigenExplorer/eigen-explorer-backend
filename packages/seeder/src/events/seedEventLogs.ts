import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from '../utils/seeder'
import {
	type TransactionLog,
	type AVSMetadataURIUpdatedLog,
	type OperatorAVSRegistrationStatusUpdatedLog,
	type OperatorMetadataURIUpdatedLog,
	type OperatorSharesIncreasedLog,
	type OperatorSharesDecreasedLog,
	type PodDeployedLog,
	type StakerDelegatedLog,
	type StakerUndelegatedLog,
	getBlockDataFromDb,
	updateTableAVSMetadataURIUpdated,
	updateTableOperatorAVSRegistrationStatusUpdated,
	updateTableOperatorMetadataURIUpdated,
	updateTableOperatorSharesIncreased,
	updateTableOperatorSharesDecreased,
	updateTablePodDeployed,
	updateTableStakerDelegated,
	updateTableStakerUndelegated
} from '../utils/events'

const blockSyncKey = 'lastSyncedBlock_logs'

/**
 * Utility function to seed logs for 8 events
 *
 * @param fromBlock
 * @param toBlock
 */
export async function seedEventLogs(toBlock?: bigint, fromBlock?: bigint) {
	console.log('Seeding Event Logs ...')

	const viemClient = getViemClient()

	const avsMetadataURIUpdatedList: Map<
		TransactionLog,
		AVSMetadataURIUpdatedLog
	> = new Map()
	const operatorAVSRegistrationStatusUpdatedList: Map<
		TransactionLog,
		OperatorAVSRegistrationStatusUpdatedLog
	> = new Map()
	const operatorMetadataURIUpdatedList: Map<
		TransactionLog,
		OperatorMetadataURIUpdatedLog
	> = new Map()
	const operatorSharesIncreasedList: Map<
		TransactionLog,
		OperatorSharesIncreasedLog
	> = new Map()
	const operatorSharesDecreasedList: Map<
		TransactionLog,
		OperatorSharesDecreasedLog
	> = new Map()
	const podDeployedList: Map<TransactionLog, PodDeployedLog> = new Map()
	const stakerDelegatedList: Map<TransactionLog, StakerDelegatedLog> = new Map()
	const stakerUndelegatedList: Map<TransactionLog, StakerUndelegatedLog> =
		new Map()

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()
	const blockData = await getBlockDataFromDb(firstBlock, lastBlock)

	// Loop through evm logs for all 8 events from 3 contracts
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
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
						const eventData: AVSMetadataURIUpdatedLog = {
							avs: log.args.avs,
							metadataURI: log.args.metadataURI
						}
						avsMetadataURIUpdatedList.set(transactionData, eventData)
						break
					}

					case 'OperatorAVSRegistrationStatusUpdated': {
						const eventData: OperatorAVSRegistrationStatusUpdatedLog = {
							operator: log.args.operator,
							avs: log.args.avs,
							status: log.args.status || 0
						}
						operatorAVSRegistrationStatusUpdatedList.set(
							transactionData,
							eventData
						)
						break
					}

					case 'OperatorMetadataURIUpdated': {
						const eventData: OperatorMetadataURIUpdatedLog = {
							operator: log.args.operator,
							metadataURI: log.args.metadataURI
						}
						operatorMetadataURIUpdatedList.set(transactionData, eventData)
						break
					}

					case 'OperatorSharesIncreased': {
						const shares = log.args.shares
						if (!shares) continue

						const eventData: OperatorSharesIncreasedLog = {
							operator: log.args.operator,
							staker: log.args.staker,
							strategy: log.args.strategy,
							shares: shares.toString()
						}
						operatorSharesIncreasedList.set(transactionData, eventData)
						break
					}

					case 'OperatorSharesDecreased': {
						const shares = log.args.shares
						if (!shares) continue

						const eventData: OperatorSharesDecreasedLog = {
							operator: log.args.operator,
							staker: log.args.staker,
							strategy: log.args.strategy,
							shares: shares.toString()
						}
						operatorSharesDecreasedList.set(transactionData, eventData)
						break
					}

					case 'PodDeployed': {
						const eventData: PodDeployedLog = {
							eigenPod: log.args.eigenPod,
							podOwner: log.args.podOwner
						}
						podDeployedList.set(transactionData, eventData)
						break
					}

					case 'StakerDelegated': {
						const staker = log.args.staker
						if (!staker) continue

						const eventData: StakerDelegatedLog = {
							staker: staker,
							operator: log.args.operator
						}
						stakerDelegatedList.set(transactionData, eventData)
						break
					}

					case 'StakerUndelegated': {
						const eventData: StakerUndelegatedLog = {
							staker: log.args.staker,
							operator: log.args.operator
						}
						stakerUndelegatedList.set(transactionData, eventData)
					}
				}
			}
			console.log(
				`Event logs registered between blocks ${fromBlock} ${toBlock}: ${logs.length}`
			)
		} catch (error) {}
	})

	// Update all EventLog tables with the respective event log data
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	await updateTableAVSMetadataURIUpdated(
		dbTransactions,
		avsMetadataURIUpdatedList
	)
	await updateTableOperatorAVSRegistrationStatusUpdated(
		dbTransactions,
		operatorAVSRegistrationStatusUpdatedList
	)
	await updateTableOperatorMetadataURIUpdated(
		dbTransactions,
		operatorMetadataURIUpdatedList
	)
	await updateTableOperatorSharesIncreased(
		dbTransactions,
		operatorSharesIncreasedList
	)
	await updateTableOperatorSharesDecreased(
		dbTransactions,
		operatorSharesDecreasedList
	)
	await updateTablePodDeployed(dbTransactions, podDeployedList)
	await updateTableStakerDelegated(dbTransactions, stakerDelegatedList)
	await updateTableStakerUndelegated(dbTransactions, stakerUndelegatedList)

	// Store last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)

	console.log('Seeded AVSMetadataURIUpdated:', avsMetadataURIUpdatedList.size)
	console.log(
		'Seeded OperatorAVSRegistrationStatusUpdated:',
		operatorAVSRegistrationStatusUpdatedList.size
	)
	console.log(
		'Seeded OperatorMetadataURIUpdated:',
		operatorMetadataURIUpdatedList.size
	)
	console.log(
		'Seeded OperatorSharesIncreased:',
		operatorSharesIncreasedList.size
	)
	console.log(
		'Seeded OperatorSharesDecreased:',
		operatorSharesDecreasedList.size
	)
	console.log('Seeded PodDeployed:', podDeployedList.size)
	console.log('Seeded StakerDelegated:', stakerDelegatedList.size)
	console.log('Seeded StakerUndelegated:', stakerUndelegatedList.size)
}
