import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import { getNetwork } from './utils/viemClient'
import { bulkUpdateDbTransactions } from './utils/seeder'
import { fetchTokenPrices } from './utils/tokenPrices'

interface ClaimData {
	earner: string
	token: string
	snapshot: number
	cumulative_amount: string
}

/**
 * Seeds the StakerRewardSnapshot table to maintain latest state of all EL stakers
 *
 * @returns
 */
export async function seedStakerRewardSnapshots() {
	const prismaClient = getPrismaClient()
	const bucketUrl = getBucketUrl()
	const BATCH_SIZE = 10_000

	try {
		const tokenPrices = await fetchTokenPrices()

		// Find latest snapshot timestamp
		const latestLog = await prismaClient.eventLogs_DistributionRootSubmitted.findFirstOrThrow({
			select: {
				rewardsCalculationEndTimestamp: true
			},
			orderBy: {
				rewardsCalculationEndTimestamp: 'desc'
			}
		})
		const latestSnapshotTimestamp = new Date(
			Number(latestLog.rewardsCalculationEndTimestamp) * 1000
		)
			.toISOString()
			.split('T')[0]

		// Find snapshot date of existing data
		const snapshotRecord = await prismaClient.stakerRewardSnapshot.findFirst({
			select: {
				timestamp: true
			},
			orderBy: {
				timestamp: 'asc' // All snapshots should ideally have the same timestamp, but we check for earliest in case of sync issues
			}
		})

		const snapshotTimestamp = snapshotRecord?.timestamp?.toISOString()?.split('T')[0]

		if (latestSnapshotTimestamp === snapshotTimestamp) {
			console.log('[In Sync] [Data] Staker Reward Snapshots')
			return
		}

		// Fetch latest snapshot from EL bucket
		const response = await fetch(`${bucketUrl}/${latestSnapshotTimestamp}/claim-amounts.json`)
		if (!response.ok) {
			throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
		}

		const reader = response.body?.getReader()
		if (!reader) {
			throw new Error('No readable stream available')
		}

		// Delete existing snapshots
		await prismaClient.stakerRewardSnapshot.deleteMany()

		// Write new snapshots batch-wise
		let buffer = ''
		const decoder = new TextDecoder()

		let snapshotList: prisma.StakerRewardSnapshot[] = []

		try {
			while (true) {
				const { done, value } = await reader.read()

				if (done) {
					// Process any remaining data in buffer
					const line = buffer.trim()
					if (line) {
						const data = JSON.parse(line) as ClaimData

						const tokenDecimals =
							tokenPrices.find((tp) => tp.address.toLowerCase() === data.token.toLowerCase())
								?.decimals || 18

						snapshotList.push({
							stakerAddress: data.earner.toLowerCase(),
							tokenAddress: data.token.toLowerCase(),
							cumulativeAmount: new prisma.Prisma.Decimal(data.cumulative_amount).div(
								new prisma.Prisma.Decimal(10).pow(tokenDecimals)
							),
							timestamp: new Date(data.snapshot)
						})
					}
					break
				}

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')

				// Process all complete lines
				for (let i = 0; i < lines.length - 1; i++) {
					const line = lines[i].trim()
					if (line) {
						const data = JSON.parse(line) as ClaimData

						const tokenDecimals =
							tokenPrices.find((tp) => tp.address.toLowerCase() === data.token.toLowerCase())
								?.decimals || 18

						snapshotList.push({
							stakerAddress: data.earner.toLowerCase(),
							tokenAddress: data.token.toLowerCase(),
							cumulativeAmount: new prisma.Prisma.Decimal(data.cumulative_amount).div(
								new prisma.Prisma.Decimal(10).pow(tokenDecimals)
							),
							timestamp: new Date(data.snapshot)
						})
					}

					// If batch is full, write to database
					if (snapshotList.length >= BATCH_SIZE) {
						// biome-ignore lint/suspicious/noExplicitAny: <explanation>
						const dbTransactions: any[] = []
						dbTransactions.push(
							prismaClient.stakerRewardSnapshot.createMany({
								data: snapshotList,
								skipDuplicates: true
							})
						)

						await bulkUpdateDbTransactions(
							dbTransactions,
							`[Data] Staker Reward Snapshots: ${snapshotList.length}`
						)

						snapshotList = []
					}

					// Keep the last incomplete line in buffer
					buffer = lines[lines.length - 1]
				}
			}

			// Save any remaining batch
			if (snapshotList.length > 0) {
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				const dbTransactions: any[] = []
				dbTransactions.push(
					prismaClient.stakerRewardSnapshot.createMany({
						data: snapshotList,
						skipDuplicates: true
					})
				)

				await bulkUpdateDbTransactions(
					dbTransactions,
					`[Data] Staker Reward Snapshots: ${snapshotList.length}`
				)
			}
		} finally {
			reader.releaseLock()
		}
	} catch {}
}

function getBucketUrl(): string {
	return getNetwork().testnet
		? 'https://eigenlabs-rewards-testnet-holesky.s3.amazonaws.com/testnet/holesky'
		: 'https://eigenlabs-rewards-mainnet-ethereum.s3.amazonaws.com/mainnet/ethereum'
}
