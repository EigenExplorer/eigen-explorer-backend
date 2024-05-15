import type { LogDetails } from './monitoring'
import { sendSlackMessage } from './slackClient'

export function logRegistry(registryDetails: LogDetails, syncKeys: string[]) {
	console.log(`Monitor #${registryDetails.index} registered!`)
	console.log(`Network: ${registryDetails.network}`)
	console.log(`Keys monitored: ${syncKeys.join(', ')}\n`)
}

export function logMonitorStatus(
	statusDetails: LogDetails,
	inSyncKeys: string[],
	outOfSyncKeys: string[],
	lastSlackMessage: number,
	coolOffPeriod: number
): boolean {
	const now = new Date().getTime()
	console.log(
		`Monitoring Seeder #${statusDetails.index} Status: ${new Date(now)}`
	)
	console.log(`[InSync] => ${inSyncKeys.join(', ')}`)
	console.log(`[OutOfSync] => ${outOfSyncKeys.join(', ')}\n`)

	if (now > lastSlackMessage + coolOffPeriod) {
		sendSlackMessage(
			`alerts-${statusDetails.network.toLowerCase()}`,
			`Monitoring Seeder #${statusDetails.index} Status: ${new Date(
				now
			)}\n[InSync] => ${inSyncKeys.join(
				', '
			)}\n[OutOfSync] => ${outOfSyncKeys.join(', ')}`
		)
		return true
	}
	return false
}
