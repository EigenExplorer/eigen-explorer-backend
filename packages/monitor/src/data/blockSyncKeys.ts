type SyncKeys = {
    avs: [string, number]
    avsOperators: [string, number]
    operators: [string, number]
    operatorShares: [string, number]
    pods: [string, number]
    stakers: [string, number]
}

export const blockSyncKeys: SyncKeys = {
    avs: ['lastSyncedBlock_avs', 120],
    avsOperators: ['lastSyncedBlock_avsOperators', 120],
    operators: ['lastSyncedBlock_operators', 120],
    operatorShares: ['lastSyncedBlock_operatorShares', 120],
    pods: ['lastSyncedBlock_pods', 600],
    stakers: ['lastSyncedBlock_stakers', 120],
}