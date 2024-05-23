import 'dotenv/config'
import { blockSyncKeys } from './data/blockSyncKeys'
import { getViemClient, getNetwork } from './utils/viemClient'
import { logRegistry, logMonitorStatus } from './utils/loggers'
import {
	fetchLastSyncBlockInfo,
	delay,
	type LastSyncBlockInfo,
	type LogDetails
} from './utils/monitoring'

/**
 * Groups keys by how often they are seeded, which is defined in blockSyncKeys.
 *
 * @returns
 */
function groupKeysByRefreshRate() {
	const groups: Record<number, string[]> = {}

	for (const [, value] of Object.entries(blockSyncKeys)) {
		let refreshRate: number
		let syncKey: string

		if (typeof value === 'string') {
			syncKey = value
			refreshRate = 120 * 1000 // Default to 2 minutes
		} else if (Array.isArray(value)) {
			syncKey = value[0]
			refreshRate = value[1] * 1000
		} else {
			continue
		}

		if (!groups[refreshRate]) {
			groups[refreshRate] = []
		}
		groups[refreshRate].push(syncKey)
	}
	return groups
}

/**
 * For any given group of keys, first checks db to see when the last update was made.
 * Then, it is set on a time schedule to monitor the keys every epoch (as defined in blockSyncKeys).
 * Next checkup is always calculated from the latest updatedAt timestamp. This keeps the monitor in sync with the seeder.
 * When it's time to perform checkup, retrieves the latest block, waits for acceptableDelay ms and then calls processSyncData().
 *
 * @param syncKeys
 * @param refreshRate
 * @param index
 */
async function fetchSyncData(
	syncKeys: string[],
	refreshRate: number,
	index: number
): Promise<void> {
	try {
		const registryDetails: LogDetails = {
			index: index,
			network: getNetwork().name,
			refreshRate: refreshRate
		}
		let prevOutOfSync = false
		let lastSlackMessage = 0

		logRegistry(registryDetails, syncKeys)

		while (true) {
			const results = await Promise.all(
				syncKeys.map((key) => fetchLastSyncBlockInfo(key))
			)

			const { inSyncKeys, outOfSyncKeys } = await processSyncData(
				syncKeys,
				results,
				refreshRate
			)

			const statusDetails: LogDetails = {
				index: index,
				network: getNetwork().name,
				refreshRate: refreshRate
			}

			if (!(outOfSyncKeys[0] === 'none')) {
				prevOutOfSync = true

				const ifSlackMessage = logMonitorStatus(
					statusDetails,
					inSyncKeys,
					outOfSyncKeys,
					lastSlackMessage,
					600000
				)

				lastSlackMessage = ifSlackMessage
					? new Date().getTime()
					: lastSlackMessage
			} else {
				lastSlackMessage = 0
				console.log('[InSync]', inSyncKeys, outOfSyncKeys)

				if (prevOutOfSync) {
					prevOutOfSync = false
					logMonitorStatus(statusDetails, inSyncKeys, outOfSyncKeys, 0, 0)
				}
			}

			await delay(60000) // Run every 1 minute
		}
	} catch (error) {
		console.error('Error during initial synchronization:', error)
	}
}

/**
 * Checks each key's value in the Settings table.
 * Stores keys that are in-sync & out-of-sync in different registries.
 *
 * @param syncKeys
 * @param results
 * @param latestBlock
 * @returns
 */
async function processSyncData(
	syncKeys: string[],
	results: LastSyncBlockInfo[],
	refreshRate: number
): Promise<{ inSyncKeys: string[]; outOfSyncKeys: string[] }> {
	const newInSyncKeys: string[] = []
	const newOutOfSyncKeys: string[] = []

	for (let i = 0; i < syncKeys.length; i++) {
		const key = syncKeys[i]
		const result = results[i]

		if (new Date().getTime() - result.updatedAt.getTime() >= refreshRate * 2) {
			newOutOfSyncKeys.push(key)
		} else {
			newInSyncKeys.push(key)
		}
	}

	newInSyncKeys.length > 0 ? newInSyncKeys : newInSyncKeys.push('none')
	newOutOfSyncKeys.length > 0 ? newOutOfSyncKeys : newOutOfSyncKeys.push('none')

	return {
		inSyncKeys: newInSyncKeys,
		outOfSyncKeys: newOutOfSyncKeys
	}
}

/**
 * Kicks off the entire monitoring process.
 *
 */
function startMonitoring(): void {
	const groups = groupKeysByRefreshRate()
	let index = 1
	for (const [refreshRate, syncKeys] of Object.entries(groups)) {
		fetchSyncData(syncKeys, Number.parseInt(refreshRate, 10), index)
		index++
	}
}

startMonitoring()
