import { getPrismaClient } from './prismaClient'

export interface LastSyncBlockInfo {
    lastBlock: bigint;
    updatedAt: Date;
}

export interface KeyState {
    nextFetch: Date;
	lastUpdatedAt: Date
    lastSyncedBlock: bigint;
}

export const baseBlock =
	process.env.NETWORK && process.env.NETWORK === 'holesky'
		? 1159609n
		: 17000000n

export async function fetchLastSyncBlockInfo(key: string): Promise<LastSyncBlockInfo> {
	const prismaClient = getPrismaClient()

	const lastSyncedBlockData = await prismaClient.settings.findUnique({
		where: { key },
		select: { value: true, updatedAt: true }
	})

    return {
        lastBlock: lastSyncedBlockData?.value ? BigInt(lastSyncedBlockData.value as number) : baseBlock,
    	updatedAt: lastSyncedBlockData?.updatedAt ? new Date(lastSyncedBlockData.updatedAt) : new Date()
    }
}

export function delay(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds))
}