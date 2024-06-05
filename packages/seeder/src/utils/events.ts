import { getPrismaClient } from '../utils/prismaClient'

// TBD
export interface TransactionLog {
	address: string
	transactionHash: string
	transactionIndex: number
	blockNumber: bigint
	blockHash: string
	blockTime: Date
}

// TBD
export async function fetchLastLogBlock(): Promise<bigint> {
	const prismaClient = getPrismaClient()

	const lastSyncedBlockData = await prismaClient.settings.findUnique({
		where: { key: 'lastSyncedBlock_logs' }
	})

	return lastSyncedBlockData?.value
		? BigInt(lastSyncedBlockData.value as number)
		: 0n
}
