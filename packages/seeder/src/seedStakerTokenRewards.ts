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
 * Seeds the table StakerRewardSnapshots to maintain only latest state of all EE users who are stakers
 *
 * @returns
 */
export async function seedStakerTokenRewards() {
	const prismaClient = getPrismaClient()
	const bucketUrl = getBucketUrl()
	const BATCH_SIZE = 1000

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

		// Fetch latest snapshot from EL bucket
		const response = await fetch(`${bucketUrl}/${latestSnapshotTimestamp}/claim-amounts.json`)
		if (!response.ok) {
			throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
		}

		const reader = response.body?.getReader()
		if (!reader) {
			throw new Error('No readable stream available')
		}

		let skip = 0
		const take = 10_000

		while (true) {
			const trackedStakers = await prismaClient.user.findMany({
				select: {
					address: true,
					staker: true
				},
				orderBy: {
					createdAt: 'desc'
				},
				skip,
				take
			})

			if (trackedStakers.length === 0) {
				console.log('[In Sync] [Data] Staker Reward Snapshots')
				return
			}

			const latestIndexedSnapshot = await prismaClient.stakerTokenRewards.findFirst({
				select: {
					timestamp: true
				},
				orderBy: {
					timestamp: 'desc'
				}
			})

			let snapshotsToUpdate: Set<string> = new Set()
			let snapshotsToCreate: Set<string> = new Set()

			if (
				!latestIndexedSnapshot ||
				latestIndexedSnapshot.timestamp.toISOString().split('T')[0] !== latestSnapshotTimestamp
			) {
				// All stakers need update
				snapshotsToUpdate = new Set(trackedStakers.map((staker) => staker.address))
			} else {
				// New/stale stakers need update
				const [trackedSnapshots, staleSnapshots] = await Promise.all([
					prismaClient.stakerTokenRewards.findMany({
						where: {
							stakerAddress: {
								in: trackedStakers.map((staker) => staker.address)
							}
						}
					}),
					prismaClient.stakerTokenRewards.findMany({
						where: {
							timestamp: {
								not: new Date(latestSnapshotTimestamp)
							}
						},
						select: {
							stakerAddress: true
						},
						distinct: ['stakerAddress']
					})
				])

				// Grab untracked addresses (those in `trackedStakers` but not in `trackedSnapshots`)
				snapshotsToCreate = new Set(
					trackedStakers
						.filter(
							(staker) =>
								!trackedSnapshots.map((snapshot) => snapshot.stakerAddress).includes(staker.address)
						)
						.map((staker) => staker.address)
				)

				// Grab stale addresses
				snapshotsToUpdate = new Set(staleSnapshots.map((record) => record.stakerAddress))
			}

			if (snapshotsToCreate.size === 0 && snapshotsToUpdate.size === 0) {
				console.log('[In Sync] [Data] Staker Reward Snapshots')
				return
			}

			let buffer = ''
			const decoder = new TextDecoder()

			let createBatchList: prisma.StakerTokenRewards[] = []
			let updateBatchList: prisma.StakerTokenRewards[] = []

			try {
				while (true) {
					const { done, value } = await reader.read()

					if (done) {
						// Process any remaining data in buffer
						const line = buffer.trim()
						if (line) {
							processLine(
								line,
								snapshotsToCreate,
								snapshotsToUpdate,
								tokenPrices,
								createBatchList,
								updateBatchList
							)
						}
						break
					}

					buffer += decoder.decode(value, { stream: true })
					const lines = buffer.split('\n')

					// Process all complete lines
					for (let i = 0; i < lines.length - 1; i++) {
						const line = lines[i].trim()
						if (line) {
							processLine(
								line,
								snapshotsToCreate,
								snapshotsToUpdate,
								tokenPrices,
								createBatchList,
								updateBatchList
							)
						}

						// If batch is full, save to database
						if (createBatchList.length >= BATCH_SIZE) {
							await writeToDb(prismaClient, createBatchList, 'create')
							createBatchList = []
						}

						if (updateBatchList.length >= BATCH_SIZE) {
							await writeToDb(prismaClient, updateBatchList, 'update')
							updateBatchList = []
						}
					}

					// Keep the last incomplete line in buffer
					buffer = lines[lines.length - 1]
				}

				// Save any remaining batch
				if (createBatchList.length > 0) {
					await writeToDb(prismaClient, createBatchList, 'create')
				}

				if (updateBatchList.length > 0) {
					await writeToDb(prismaClient, updateBatchList, 'update')
				}
			} finally {
				reader.releaseLock()
			}

			skip += take
		}
	} catch (error) {
		console.error('Error in seedStakerRewardSnapshots:', error)
		throw error
	}
}

function processLine(
	line: string,
	snapshotsToCreate: Set<string>,
	snapshotsToUpdate: Set<string>,
	tokenPrices: Array<{ address: string; decimals: number }>,
	createBatchList: prisma.StakerTokenRewards[],
	updateBatchList: prisma.StakerTokenRewards[]
) {
	const data = JSON.parse(line) as ClaimData
	const earner = data.earner.toLowerCase()
	if (snapshotsToCreate.size > 0) {
		if (snapshotsToCreate.has(earner)) {
			const tokenDecimals =
				tokenPrices.find((tp) => tp.address.toLowerCase() === data.token.toLowerCase())?.decimals ||
				18

			createBatchList.push({
				stakerAddress: data.earner.toLowerCase(),
				tokenAddress: data.token.toLowerCase(),
				cumulativeAmount: new prisma.Prisma.Decimal(data.cumulative_amount).div(
					new prisma.Prisma.Decimal(10).pow(tokenDecimals)
				),
				timestamp: new Date(data.snapshot)
			})

			snapshotsToCreate.delete(earner)
		}
	}
	if (snapshotsToUpdate.size > 0) {
		if (snapshotsToUpdate.has(earner)) {
			const tokenDecimals =
				tokenPrices.find((tp) => tp.address.toLowerCase() === data.token.toLowerCase())?.decimals ||
				18

			updateBatchList.push({
				stakerAddress: data.earner.toLowerCase(),
				tokenAddress: data.token.toLowerCase(),
				cumulativeAmount: new prisma.Prisma.Decimal(data.cumulative_amount).div(
					new prisma.Prisma.Decimal(10).pow(tokenDecimals)
				),
				timestamp: new Date(data.snapshot)
			})

			snapshotsToUpdate.delete(earner)
		}
	}
}

async function writeToDb(
	prismaClient: prisma.PrismaClient,
	batch: prisma.StakerTokenRewards[],
	action: 'create' | 'update'
) {
	if (batch.length === 0) return

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (action === 'update') {
		dbTransactions.push(
			prismaClient.stakerTokenRewards.deleteMany({
				where: {
					stakerAddress: {
						in: batch.map((record) => record.stakerAddress)
					}
				}
			})
		)
	}

	dbTransactions.push(
		prismaClient.stakerTokenRewards.createMany({
			data: batch,
			skipDuplicates: true
		})
	)

	if (dbTransactions.length > 0) {
		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Data] Staker Reward Snapshots batch size: ${batch.length}`
		)
	}
}

function getBucketUrl(): string {
	return getNetwork().testnet
		? 'https://eigenlabs-rewards-testnet-holesky.s3.amazonaws.com/testnet/holesky'
		: 'https://eigenlabs-rewards-mainnet-ethereum.s3.amazonaws.com/mainnet/ethereum'
}
