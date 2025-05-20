import type { Chain } from 'viem'
import { holesky, sepolia } from 'viem/chains'
import { getNetwork } from '../../viem/viemClient'
import { eigenHoleskyContracts } from './eigenHoleskyContracts'
import { eigenContracts } from './eigenMainnetContracts'
import { eigenSepoliaContracts } from './eigenSepoliaContracts'

export interface EigenStrategiesContractAddress {
	Eigen?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	WETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	cbETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	stETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	rETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	ETHx?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	ankrETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	oETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	osETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	swETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	wBETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	sfrxETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	lsETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
	mETH?: { strategyContract: `0x${string}`; tokenContract: `0x${string}` }
}

export interface RewardsTokensContractAddress {
	ARPA?: `0x${string}`
}

export interface EigenContractAddress {
	AVSDirectory: `0x${string}`
	DelegationManager: `0x${string}`
	Slasher: `0x${string}`
	StrategyManager: `0x${string}`
	EigenPodManager: `0x${string}`
	RewardsCoordinator: `0x${string}`
	AllocationManager: `0x${string}`
}

export function getEigenContracts(network?: Chain) {
	const chain = network ? network : getNetwork()

	switch (chain) {
		case sepolia:
			return eigenSepoliaContracts
		case holesky:
			return eigenHoleskyContracts
		default:
			return eigenContracts
	}
}
