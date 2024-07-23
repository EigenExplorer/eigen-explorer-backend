import { holesky } from 'viem/chains'
import { getNetwork } from './viemClient'

const SECONDS_PER_SLOT = 12
const SLOTS_PER_EPOCH = 32

function getGenesisTime() {
	const network = getNetwork()

	if (network === holesky) {
		return 1695902400
	}

	return 1606824023
}

export function dateToEpoch(date: Date): number {
	const GENESIS_TIME = getGenesisTime()

	const timestamp = Math.floor(date.getTime() / 1000)
	const secondsSinceGenesis = timestamp - GENESIS_TIME
	const slots = Math.floor(secondsSinceGenesis / SECONDS_PER_SLOT)
	const epoch = Math.floor(slots / SLOTS_PER_EPOCH)

	return epoch
}

export function epochToTimestamp(epoch: number): number {
	const GENESIS_TIME = getGenesisTime()

	const secondsPerEpoch = SECONDS_PER_SLOT * SLOTS_PER_EPOCH
	const epochDuration = epoch * secondsPerEpoch
	const timestamp = GENESIS_TIME + epochDuration

	return timestamp
}
