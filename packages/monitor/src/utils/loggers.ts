import { sendSlackMessage } from './slackClient'

export function logRegistry(index: number, refreshRate: number, syncKeys: string[]) {
    console.log(`Monitor #${index} registered!`)
    console.log(`Checkup interval: ${refreshRate / 1000} seconds`)
    console.log(`Keys monitored: ${syncKeys.join(', ')}\n`)
}

export function logStatus(index: number, latestTimestamp: Date, fetchInterval: number) {
    console.log(`Monitor #${index} status`)
    console.log("Last DB fetch: ", new Date(latestTimestamp.getTime()))
    console.log(`Next checkup in ${fetchInterval / 1000} seconds\n`)
}

export function logCheckup(index: number, network: string, latestBlock: bigint, acceptableDelay: number) {
    console.log(`Monitor #${index} checkup activated`)
    console.log(`Latest block on ${network}: ${latestBlock}`)
    console.log(`Waiting for ${acceptableDelay / 1000} seconds\n`)
}

export function logCritical(index: number, minutesSinceUpdate: number) {
    console.log(`Critical Alert on Monitor ${index}!`)
    console.log(`DB expected updated ${minutesSinceUpdate} minutes ago but hasn't been updated.`)

    sendSlackMessage("alerts", `Critical Alert on Monitor ${index}!\nDB expected update ${minutesSinceUpdate} minutes ago but hasn't been updated.`)
}

export function logInSync(key: string, latestBlock: bigint, lastSyncedBlock: bigint) {
    console.log(`${key} is in sync. [Latest block: ${latestBlock} | Value: ${lastSyncedBlock}]`)
}

export function logOutOfSync(key: string, latestBlock: bigint, lastSyncedBlock: bigint, lastUpdatedAt: Date) {   
    console.log(`${key} is out of sync`)
    console.log(`Latest block: ${latestBlock} | Current value: ${lastSyncedBlock}`)
    console.log(`Block lag: ${latestBlock - lastSyncedBlock} blocks`)
    console.log("Last updated at: ", new Date(lastUpdatedAt.getTime()))
    console.log()

    sendSlackMessage("alerts", `Alert: ${key} is out of sync\nLatest block: ${latestBlock} | Current value: ${lastSyncedBlock}\nBlock lag: ${latestBlock - lastSyncedBlock} blocks\nLast updated at: ` + new Date(lastUpdatedAt.getTime()))

}

export function logSynced(key: string, expectedUpdate: number, lastSyncedBlock: bigint, actualUpdate: number, latestBlock: bigint) {
    const delayInSeconds = (actualUpdate - expectedUpdate) / 1000

    console.log(`${key} is now back in sync`)
    console.log(`Expected sync time: ${expectedUpdate}`)
    console.log(`Actual sync time: ${actualUpdate}`)
    console.log(`Time delay: ${delayInSeconds} seconds`)
    console.log(`Block lag before sync: ${latestBlock - lastSyncedBlock}\n`)

    sendSlackMessage("alerts", `Alert: ${key} is now back in sync\nExpected sync time: ${expectedUpdate}\nActual sync time: ${actualUpdate}\nTime delay: ${delayInSeconds} seconds\nBlock lag before sync: ${latestBlock - lastSyncedBlock}\n`)
}