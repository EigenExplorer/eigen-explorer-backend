import { getNetwork } from '../viem/viemClient'

interface SyncConfig {
	key: string
	syncThreshold: number
}

// Block time constants (in seconds)
const MAINNET_BLOCK_TIME = 12
const TESTNET_BLOCK_TIME = 2

const THIRTY_MINS_BLOCKS =
	(30 * 60) / (getNetwork().testnet ? TESTNET_BLOCK_TIME : MAINNET_BLOCK_TIME)
const ONE_DAY_BLOCKS =
	(25 * 60 * 60) / (getNetwork().testnet ? TESTNET_BLOCK_TIME : MAINNET_BLOCK_TIME)
const ONE_DAY_MS = 25 * 60 * 60 * 1000

export const syncConfigs: SyncConfig[] = [
	// Block-based syncs
	{ key: 'lastSyncedBlock_logs_pods', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_avs', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_avsOperators', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_operators', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_operatorShares', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_stakers', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_strategyWhitelist', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_podShares', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_distributionRootSubmitted', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_deposit', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_completedWithdrawals', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_queuedWithdrawals', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_logs_avsRewardsSubmission', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_pods', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_avs', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_operators', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_avsOperators', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_operatorShares', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_strategies', syncThreshold: ONE_DAY_BLOCKS },
	{ key: 'lastSyncedBlock_stakers', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_deposit', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_avsStrategyRewards', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_completedWithdrawals', syncThreshold: THIRTY_MINS_BLOCKS },
	{ key: 'lastSyncedBlock_queuedWithdrawals', syncThreshold: THIRTY_MINS_BLOCKS },

	// Time-based syncs
	{ key: 'lastSyncedTimestamp_metrics_restaking', syncThreshold: ONE_DAY_MS },
	{ key: 'lastSyncedTime_metrics_deposit', syncThreshold: ONE_DAY_MS },
	{ key: 'lastSyncedTime_metrics_stakerRewards', syncThreshold: ONE_DAY_MS },
	{ key: 'lastSyncedTimestamp_metrics_tvl', syncThreshold: ONE_DAY_MS },
	{ key: 'lastSyncedTimestamp_metrics_eigenPods', syncThreshold: ONE_DAY_MS },
	{ key: 'lastSyncedTime_metrics_withdrawal', syncThreshold: ONE_DAY_MS }
]

// Helper function to get just the keys if needed
export const includedBlockSyncKeys = syncConfigs.map((config) => config.key)
