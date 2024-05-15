type SyncKeys = {
	avs: [string, number]
	avsOperators: [string, number]
	operators: [string, number]
	operatorShares: [string, number]
	pods: [string, number]
	stakers: [string, number]
}

export const blockSyncKeys: SyncKeys = {
	avs: ['lastSyncedBlock_avs', 120], // Monitor 1
	avsOperators: ['lastSyncedBlock_avsOperators', 120], // Monitor 1
	operators: ['lastSyncedBlock_operators', 120], // Monitor 1
	operatorShares: ['lastSyncedBlock_operatorShares', 120], // Monitor 1
	stakers: ['lastSyncedBlock_stakers', 120], // Monitor 1
	pods: ['lastSyncedBlock_pods', 600] // Monitor 2
}
