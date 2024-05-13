import 'dotenv/config'
import { blockSyncKeys } from './data/blockSyncKeys'
import { getViemClient, getNetwork } from './utils/viemClient'
import { fetchLastSyncBlockInfo, delay, LastSyncBlockInfo, KeyState } from './utils/monitoring'
import { logStatus, logRegistry, logCheckup, logSynced, logOutOfSync, logInSync } from './utils/loggers'

const viemClient = getViemClient()

const acceptableDelay = Number(process.env.ACCEPTABLE_DELAY)   // Acceptable lag in ms between seeder fetching block data and writing it to db
let outOfSyncKeyStates: Map<string, KeyState> = new Map()   // Registry that holds out of sync keys + data at any given point in time

/**
 * Groups "keys" by how often they are seeded, which is defined in blockSyncKeys.
 * 
 * @returns
 */
function groupKeysByRefreshRate() {
    const groups: Record<number, string[]> = {}

    Object.entries(blockSyncKeys).forEach(([key, value]) => {
        let refreshRate: number
        let syncKey: string

        if (typeof value === 'string') {
            syncKey = value
            refreshRate = 120 * 1000  // Default to 2 minutes
        } else if (Array.isArray(value)) {
            syncKey = value[0]
            refreshRate = value[1] * 1000
        } else {
            return
        }

        if (!groups[refreshRate]) {
            groups[refreshRate] = []
        }
        groups[refreshRate].push(syncKey)
    })

    return groups
}

/**
 * For any given group of keys, first checks db to see when the last update was made.
 * Then, is set on a time schedule to monitor the keys every epoch (as defined in blockSyncKeys).
 * When it's time to perform checkup, retrieves the latest block, waits for acceptableDelay milliseconds and then calls processSyncData().
 * 
 * @param syncKeys
 * @param refreshRate 
 * @param index 
 * @param outOfSyncKeys
 */
async function fetchSyncData(syncKeys: string[], refreshRate: number, index: number, outOfSyncKeys: string[] = []): Promise<void> {
    try {
        logRegistry(index, refreshRate, syncKeys)

        while(true) {
            const results = await Promise.all(syncKeys.map(key => fetchLastSyncBlockInfo(key)))
            const latestTimestamp = new Date(Math.max(...results.map(result => result.updatedAt.getTime())))

            const now = new Date()
            const nextFetch = new Date(latestTimestamp.getTime() + refreshRate)
            const fetchInterval = nextFetch.getTime() - now.getTime() > 0 ? nextFetch.getTime() - now.getTime() : refreshRate
            
            logStatus(index, latestTimestamp, fetchInterval)

            await delay(fetchInterval > 0 ? fetchInterval : 0)
            const latestBlock = await viemClient.getBlockNumber()
            
            logCheckup(index, getNetwork().name, latestBlock, acceptableDelay)

            await delay(acceptableDelay)
            const newResults = await Promise.all(syncKeys.map(key => fetchLastSyncBlockInfo(key)))
            const newOutOfSyncKeys = await processSyncData(syncKeys, newResults, latestBlock, outOfSyncKeys, nextFetch)
        
            outOfSyncKeys = newOutOfSyncKeys
        }
    } catch (error) {
        console.error("Error during initial synchronization:", error)
    }
}

/**
 * Checks each key's value in the Settings table (which refers to the latest block it is synced to).
 * If not synced, stores the key's data to a registry & sends a Slack alert.
 * If a previously out of sync key gets synced, removes the entry from the registry, calculates the delta of expected sync & actual sync times and sends a Slack alert.
 * 
 * @param syncKeys 
 * @param results 
 * @param latestBlock 
 * @param outOfSyncKeys 
 * @param nextFetch 
 * @returns
 */
async function processSyncData(syncKeys: string[], results: LastSyncBlockInfo[], latestBlock: bigint, outOfSyncKeys: string[], nextFetch: Date): Promise<string[]> {
    let newOutOfSyncKeys: string[] = []

    results.forEach((result, index) => {
        const key = syncKeys[index]
        if (result.lastBlock === latestBlock || result.lastBlock === latestBlock - 1n || result.lastBlock === latestBlock + 1n) {   // Key is in sync
            logInSync(key, latestBlock, result.lastBlock)
            
            const outOfSyncIndex = outOfSyncKeys.indexOf(key)
            if (outOfSyncIndex > -1) {  // Previously out of sync key is now synced
                outOfSyncKeys.splice(outOfSyncIndex, 1)
                const keyState = outOfSyncKeyStates.get(key)!
                logSynced(key, keyState.nextFetch.getTime(), keyState.lastSyncedBlock, result.updatedAt.getTime(), latestBlock)
                outOfSyncKeyStates.delete(key)
            }
        } else {    // Key is out of sync
            logOutOfSync(key, latestBlock, result.lastBlock, result.updatedAt)

            if (!outOfSyncKeys.includes(key)) {
                newOutOfSyncKeys.push(key)
                outOfSyncKeyStates.set(key, { nextFetch: nextFetch, lastUpdatedAt: result.updatedAt, lastSyncedBlock: result.lastBlock })
            }
        }
    })
    console.log()

    return newOutOfSyncKeys.length > 0 ? newOutOfSyncKeys : outOfSyncKeys
}

/**
 * Kicks off the entire monitoring process.
 * 
 */
function startMonitoring(): void {
    const groups = groupKeysByRefreshRate()
    let index = 1
    Object.entries(groups).forEach(([refreshRate, syncKeys]) => {
        fetchSyncData(syncKeys, parseInt(refreshRate, 10), index)
        index++
    })
}

startMonitoring()