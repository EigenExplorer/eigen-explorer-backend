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
			const allUsers = await prismaClient.user.findMany({
				orderBy: {
					createdAt: 'desc'
				},
				skip,
				take
			})

			if (allUsers.length === 0) {
				console.log('[In Sync] [Data] Staker Token Rewards')
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
			let usersToMarkTracked: Set<string> = new Set()

			if (
				!latestIndexedSnapshot ||
				latestIndexedSnapshot.timestamp.toISOString().split('T')[0] !== latestSnapshotTimestamp
			) {
				// All stakers need update
				snapshotsToUpdate = new Set(allUsers.map((staker) => staker.address))

				// Grab untracked addresses
				usersToMarkTracked = new Set(
					allUsers.filter((staker) => !staker.isTracked).map((staker) => staker.address)
				)
			} else {
				// New/stale stakers need update
				const staleSnapshots = await prismaClient.stakerTokenRewards.findMany({
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

				// Grab untracked addresses
				snapshotsToCreate = new Set(
					allUsers.filter((staker) => !staker.isTracked).map((staker) => staker.address)
				)

				usersToMarkTracked = snapshotsToCreate

				// Grab stale addresses
				snapshotsToUpdate = new Set(staleSnapshots.map((record) => record.stakerAddress))
			}

			if (
				snapshotsToCreate.size === 0 &&
				snapshotsToUpdate.size === 0 &&
				usersToMarkTracked.size === 0
			) {
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

						// If batch is full, write to database
						if (createBatchList.length >= BATCH_SIZE) {
							await writeToDb(prismaClient, 'create', createBatchList)
							createBatchList = []
						}

						if (updateBatchList.length >= BATCH_SIZE) {
							await writeToDb(prismaClient, 'update', updateBatchList)
							updateBatchList = []
						}
					}

					// Keep the last incomplete line in buffer
					buffer = lines[lines.length - 1]
				}

				// Save any remaining batch
				if (createBatchList.length > 0) {
					await writeToDb(prismaClient, 'create', createBatchList)
				}

				if (updateBatchList.length > 0) {
					await writeToDb(prismaClient, 'update', updateBatchList)
				}
			} finally {
				reader.releaseLock()
			}

			if (usersToMarkTracked.size > 0) {
				await writeToDb(prismaClient, undefined, undefined, usersToMarkTracked)
			}

			skip += take
		}
	} catch (error) {
		console.log(error)
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
	action?: 'create' | 'update',
	batch?: prisma.StakerTokenRewards[],
	usersToMark?: Set<string>
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (batch && batch.length > 0) {
		if (action === 'update') {
			// Delete all existing snapshots of tracked Stakers
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

		// Write all snapshots to db
		dbTransactions.push(
			prismaClient.stakerTokenRewards.createMany({
				data: batch,
				skipDuplicates: true
			})
		)

		if (dbTransactions.length > 0) {
			await bulkUpdateDbTransactions(dbTransactions, `[Data] Staker Token Rewards: ${batch.length}`)
		}
	}

	if (usersToMark && usersToMark.size > 0) {
		dbTransactions.push(
			prismaClient.user.updateMany({
				where: {
					address: {
						in: Array.from(usersToMark)
					}
				},
				data: {
					isTracked: true
				}
			})
		)

		if (dbTransactions.length > 0) {
			await bulkUpdateDbTransactions(dbTransactions, `[Data] Users tracked: ${usersToMark.size}`)
		}
	}
}

function getBucketUrl(): string {
	return getNetwork().testnet
		? 'https://eigenlabs-rewards-testnet-holesky.s3.amazonaws.com/testnet/holesky'
		: 'https://eigenlabs-rewards-mainnet-ethereum.s3.amazonaws.com/mainnet/ethereum'
}
