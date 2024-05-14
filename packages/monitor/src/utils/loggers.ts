import type { LogDetails } from "./monitoring";
import { sendSlackMessage } from "./slackClient";

export function logRegistry(registryDetails: LogDetails, syncKeys: string[]) {
	console.log(`Monitor #${registryDetails.index} registered!`);
	console.log(`Network: ${registryDetails.network}`);
	console.log(`Keys monitored: ${syncKeys.join(", ")}\n`);
}

export function logMonitorStatus(
	statusDetails: LogDetails,
	inSyncKeys: string[],
	outOfSyncKeys: string[],
	alertCounter: number,
	coolOffPeriod: number,
) {
	console.log(
		`Monitoring Seeder #${statusDetails.index} Status: ${new Date(
			new Date().getTime(),
		)}`,
	);
	console.log(`[InSync] => ${inSyncKeys.join(", ")}`);
	console.log(`[OutOfSync] => ${outOfSyncKeys.join(", ")}\n`);

	if (
		alertCounter === 1 ||
		(statusDetails.refreshRate * (alertCounter - 1)) % coolOffPeriod === 0
	) {
		sendSlackMessage(
			`alerts-${statusDetails.network.toLowerCase()}`,
			`Monitoring Seeder #${statusDetails.index} Status: ${new Date(
				new Date().getTime(),
			)}\n[InSync] => ${inSyncKeys.join(
				", ",
			)}\n[OutOfSync] => ${outOfSyncKeys.join(", ")}\n`,
		);
	}
}
