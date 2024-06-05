import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	baseBlock,
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
	getBlockDataFromDB,
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
	const blockData = await getBlockDataFromDB(firstBlock, lastBlock)

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
							avs: String(log.args.avs).toLowerCase(),
							metadataURI: String(log.args.metadataURI).toLowerCase()
						}
						avsMetadataURIUpdatedList.set(transactionData, eventData)
					}

					case 'OperatorAVSRegistrationStatusUpdated': {
						const eventData: OperatorAVSRegistrationStatusUpdatedLog = {
							operator: String(log.args.operator).toLowerCase(),
							avs: String(log.args.avs).toLowerCase(),
							status: log.args.status || 0
						}
						operatorAVSRegistrationStatusUpdatedList.set(
							transactionData,
							eventData
						)
					}

					case 'OperatorMetadataURIUpdated': {
						const eventData: OperatorMetadataURIUpdatedLog = {
							operator: String(log.args.operator).toLowerCase(),
							metadataURI: String(log.args.metadataURI).toLowerCase()
						}
						operatorMetadataURIUpdatedList.set(transactionData, eventData)
					}

					case 'OperatorSharesIncreased': {
						const shares = log.args.shares
						if (!shares) continue

						const eventData: OperatorSharesIncreasedLog = {
							operator: String(log.args.operator).toLowerCase(),
							staker: String(log.args.staker).toLowerCase(),
							strategy: String(log.args.strategy).toLowerCase(),
							shares: shares.toString()
						}
						operatorSharesIncreasedList.set(transactionData, eventData)
					}

					case 'OperatorSharesDecreased': {
						const shares = log.args.shares
						if (!shares) continue

						const eventData: OperatorSharesDecreasedLog = {
							operator: String(log.args.operator).toLowerCase(),
							staker: String(log.args.staker).toLowerCase(),
							strategy: String(log.args.strategy).toLowerCase(),
							shares: shares.toString()
						}
						operatorSharesDecreasedList.set(transactionData, eventData)
					}

					case 'PodDeployed': {
						const eventData: PodDeployedLog = {
							eigenPod: String(log.args.eigenPod).toLowerCase(),
							podOwner: String(log.args.podOwner).toLowerCase()
						}
						podDeployedList.set(transactionData, eventData)
					}

					case 'StakerDelegated': {
						const eventData: StakerDelegatedLog = {
							staker: String(log.args.staker).toLowerCase(),
							operator: String(log.args.operator).toLowerCase()
						}
						stakerDelegatedList.set(transactionData, eventData)
					}

					case 'StakerUndelegated': {
						const eventData: StakerUndelegatedLog = {
							staker: String(log.args.staker).toLowerCase(),
							operator: String(log.args.operator).toLowerCase()
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
	let dbTransactions: any[] = []
	const flag = firstBlock === baseBlock

	await updateTableAVSMetadataURIUpdated(
		dbTransactions,
		avsMetadataURIUpdatedList,
		flag
	)
	await updateTableOperatorAVSRegistrationStatusUpdated(
		dbTransactions,
		operatorAVSRegistrationStatusUpdatedList,
		flag
	)
	await updateTableOperatorMetadataURIUpdated(
		dbTransactions,
		operatorMetadataURIUpdatedList,
		flag
	)
	await updateTableOperatorSharesIncreased(
		dbTransactions,
		operatorSharesIncreasedList,
		flag
	)
	await updateTableOperatorSharesDecreased(
		dbTransactions,
		operatorSharesDecreasedList,
		flag
	)
	await updateTablePodDeployed(dbTransactions, podDeployedList, flag)
	await updateTableStakerDelegated(dbTransactions, stakerDelegatedList, flag)
	await updateTableStakerUndelegated(
		dbTransactions,
		stakerUndelegatedList,
		flag
	)

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
