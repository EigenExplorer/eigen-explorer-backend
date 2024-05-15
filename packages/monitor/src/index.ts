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

const viemClient = getViemClient()
const acceptableDelays: number[] = [
	Number(process.env.ACCEPTABLE_DELAY_1),
	Number(process.env.ACCEPTABLE_DELAY_2)
] // Acceptable lag in ms between seeder fetching block data and writing it to db (for each monitor).
const coolOffPeriod = 600000 // Minimum time in ms between two OutOfSync Slack alerts for a given monitor.

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
		let lastSlackAttempt = 0
		let ifWaited = false
		const acceptableDelay = acceptableDelays[index - 1]

		logRegistry(registryDetails, syncKeys)

		while (true) {
			const results = await Promise.all(
				syncKeys.map((key) => fetchLastSyncBlockInfo(key))
			)
			const latestTimestamp = new Date(
				Math.max(...results.map((result) => result.updatedAt.getTime()))
			)
            
			const nextFetch = new Date(latestTimestamp.getTime() + refreshRate)
			const now = new Date()
			const fetchInterval = nextFetch.getTime() - now.getTime() // If last seeder update was > refreshRate ms ago, fetchInterval will be < 0

			await delay(
				fetchInterval > 0 ? fetchInterval : ifWaited ? refreshRate / 2 : 0
			) // If ifWaited is true, the monitor has already implemented a delay of refreshRate/2 ms

			const latestBlock = await viemClient.getBlockNumber()
			await delay(acceptableDelay)

			const newResults = await Promise.all(
				syncKeys.map((key) => fetchLastSyncBlockInfo(key))
			)

			const { inSyncKeys, outOfSyncKeys } = await processSyncData(
				syncKeys,
				newResults,
				latestBlock
			)
			if (!(outOfSyncKeys[0] === 'none')) {
				const statusDetails: LogDetails = {
					index: index,
					network: getNetwork().name,
					refreshRate: refreshRate
				}

				logMonitorStatus(
					statusDetails,
					inSyncKeys,
					outOfSyncKeys,
					lastSlackAttempt,
					coolOffPeriod
				)

				lastSlackAttempt = new Date().getTime()
				await delay(refreshRate / 2) // Allow buffer time for any keys from previous iteration to sync without disrupting monitor's time schedule.
				ifWaited = true
			} else {
				ifWaited = false
			}
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
	latestBlock: bigint
): Promise<{ inSyncKeys: string[]; outOfSyncKeys: string[] }> {
	const newInSyncKeys: string[] = []
	const newOutOfSyncKeys: string[] = []

	results.forEach((result, index) => {
		const key = syncKeys[index]

		result.lastBlock === latestBlock ||
		result.lastBlock === latestBlock - 1n ||
		result.lastBlock === latestBlock + 1n
			? newInSyncKeys.push(key)
			: newOutOfSyncKeys.push(key)
	})

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
