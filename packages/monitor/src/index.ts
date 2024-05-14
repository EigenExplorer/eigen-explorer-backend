import "dotenv/config";
import { blockSyncKeys } from "./data/blockSyncKeys";
import { getViemClient, getNetwork } from "./utils/viemClient";
import { logRegistry, logMonitorStatus } from "./utils/loggers";
import {
	fetchLastSyncBlockInfo,
	delay,
	type LastSyncBlockInfo,
	type LogDetails,
} from "./utils/monitoring";

const viemClient = getViemClient();
const acceptableDelay = Number(process.env.ACCEPTABLE_DELAY); // Acceptable lag in ms between seeder fetching block data and writing it to db.
const coolOffPeriod = 600000; // Minimum time in ms between 2 OutOfSync Slack alerts for a given monitor.

/**
 * Groups keys by how often they are seeded, which is defined in blockSyncKeys.
 *
 * @returns
 */
function groupKeysByRefreshRate() {
	const groups: Record<number, string[]> = {};

	for (const [, value] of Object.entries(blockSyncKeys)) {
		let refreshRate: number;
		let syncKey: string;

		if (typeof value === "string") {
			syncKey = value;
			refreshRate = 120 * 1000; // Default to 2 minutes
		} else if (Array.isArray(value)) {
			syncKey = value[0];
			refreshRate = value[1] * 1000;
		} else {
			continue;
		}

		if (!groups[refreshRate]) {
			groups[refreshRate] = [];
		}
		groups[refreshRate].push(syncKey);
	}
	return groups;
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
	index: number,
): Promise<void> {
	try {
		const registryDetails: LogDetails = {
			index: index,
			network: getNetwork().name,
			refreshRate: refreshRate,
		};
		let calibrationCounter = 0;
		let alertCounter = 0;

		logRegistry(registryDetails, syncKeys);

		while (true) {
			const results = await Promise.all(
				syncKeys.map((key) => fetchLastSyncBlockInfo(key)),
			);
			const earliestTimestamp = new Date(
				Math.min(...results.map((result) => result.updatedAt.getTime())),
			);
			const now = new Date();

			// Provide time for an unsynced key to get synced. This helps re-calibrate monitor's checkup schedule with the seeder's.
			// Without this, any unsynced key that doesn't re-sync by the logger's next iteration will likely be reported unsynced perpetually.
			if (earliestTimestamp.getTime() < now.getTime() - refreshRate) {
				await delay(acceptableDelay);
				calibrationCounter++;
				if (!(calibrationCounter * acceptableDelay === 60000)) {
					// If key doesn't re-sync for 1 minute, we allow it to proceed and get reported as unsynced.
					continue;
				}
				calibrationCounter = 0;
			}

			const latestTimestamp = new Date(
				Math.max(...results.map((result) => result.updatedAt.getTime())),
			);
			const nextFetch = new Date(latestTimestamp.getTime() + refreshRate);
			const fetchInterval = nextFetch.getTime() - now.getTime();

			await delay(fetchInterval > 0 ? fetchInterval : 0);
			const latestBlock = await viemClient.getBlockNumber();

			await delay(acceptableDelay);
			const newResults = await Promise.all(
				syncKeys.map((key) => fetchLastSyncBlockInfo(key)),
			);

			const { inSyncKeys, outOfSyncKeys } = await processSyncData(
				syncKeys,
				newResults,
				latestBlock,
			);
			if (!(outOfSyncKeys[0] === "none")) {
				const statusDetails: LogDetails = {
					index: index,
					network: getNetwork().name,
					refreshRate: refreshRate,
				};
				alertCounter++;

				logMonitorStatus(
					statusDetails,
					inSyncKeys,
					outOfSyncKeys,
					alertCounter,
					coolOffPeriod,
				);
			} else {
				alertCounter = 0;
			}
		}
	} catch (error) {
		console.error("Error during initial synchronization:", error);
	}
}

/**
 * Checks each key's value in the Settings table (which refers to the latest block it is synced to).
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
	latestBlock: bigint,
): Promise<{ inSyncKeys: string[]; outOfSyncKeys: string[] }> {
	const newInSyncKeys: string[] = [];
	const newOutOfSyncKeys: string[] = [];

	results.forEach((result, index) => {
		const key = syncKeys[index];

		result.lastBlock === latestBlock ||
		result.lastBlock === latestBlock - 1n ||
		result.lastBlock === latestBlock + 1n
			? newInSyncKeys.push(key)
			: newOutOfSyncKeys.push(key);
	});

	newInSyncKeys.length > 0 ? newInSyncKeys : newInSyncKeys.push("none");
	newOutOfSyncKeys.length > 0
		? newOutOfSyncKeys
		: newOutOfSyncKeys.push("none");

	return {
		inSyncKeys: newInSyncKeys,
		outOfSyncKeys: newOutOfSyncKeys,
	};
}

/**
 * Kicks off the entire monitoring process.
 *
 */
function startMonitoring(): void {
	const groups = groupKeysByRefreshRate();
	let index = 1;
	for (const [refreshRate, syncKeys] of Object.entries(groups)) {
		fetchSyncData(syncKeys, Number.parseInt(refreshRate, 10), index);
		index++;
	}
}

startMonitoring();
