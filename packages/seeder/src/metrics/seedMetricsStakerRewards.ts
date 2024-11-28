import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getNetwork } from '../utils/viemClient'
import { bulkUpdateDbTransactions, fetchLastSyncTime } from '../utils/seeder'
import { fetchTokenPrices } from '../utils/tokenPrices'

interface ClaimData {
	earner: string
	token: string
	snapshot: number
	cumulative_amount: string
}

const timeSyncKey = 'lastSyncedTime_metrics_stakerRewards'

/**
 * Seeds the table MetricStakerRewardUnit to maintain historical rewards data of EE users who are stakers
 *
 * @returns
 */
export async function seedMetricsStakerRewards() {
	const prismaClient = getPrismaClient()

	// Define start date
	let startAt: Date | null = await fetchLastSyncTime(timeSyncKey)
	const endAt: Date = new Date(new Date().setUTCHours(0, 0, 0, 0))
	let clearPrev = false

	if (!startAt) {
		const firstLogTimestamp = await getFirstLogTimestamp()
		if (firstLogTimestamp) {
			startAt = new Date(new Date(firstLogTimestamp).setUTCHours(0, 0, 0, 0))
		} else {
			startAt = new Date(new Date().setUTCHours(0, 0, 0, 0))
		}
		clearPrev = true
	}

	// Bail early if there is no time diff to sync
	if (endAt.getTime() - startAt.getTime() <= 0) {
		console.log(`[In Sync] [Metrics] Staker Rewards from: ${startAt} to: ${endAt}`)
		return
	}

	// Clear previous data
	if (clearPrev) {
		await prismaClient.metricStakerRewardUnit.deleteMany()
	}

	const bucketUrl = getBucketUrl()
	const BATCH_SIZE = 10_000

	try {
		const tokenPrices = await fetchTokenPrices()

		// Check if there are any untracked users
		const untrackedUser = await prismaClient.user.findFirst({
			where: {
				isTracked: false
			}
		})

		const isTrackingRequired = !!untrackedUser

		const distributionRootsTracked =
			await prismaClient.eventLogs_DistributionRootSubmitted.findMany({
				select: {
					rewardsCalculationEndTimestamp: true
				},
				where: {
					rewardsCalculationEndTimestamp: {
						gte: startAt.getTime() / 1000,
						lt: endAt.getTime() / 1000
					}
				}
			})

		const distributionRootsUntracked = isTrackingRequired
			? await prismaClient.eventLogs_DistributionRootSubmitted.findMany({
					select: {
						rewardsCalculationEndTimestamp: true
					}
			  })
			: undefined

		// Find timestamps of distributionRoots after the last seed. These are relevant for tracked & untracked users.
		const timestampsForAllUsers = distributionRootsTracked.map(
			(dr) => dr.rewardsCalculationEndTimestamp
		)

		if (isTrackingRequired && distributionRootsUntracked) {
			// All timestamps before the last seed need to also be indexed for untracked users.
			const timestampsForUntrackedUsers = distributionRootsUntracked.map(
				(dr) => dr.rewardsCalculationEndTimestamp
			)

			// Seed data for untracked users until last seed, so they will be in sync with tracked users
			for (const timestamp of timestampsForUntrackedUsers) {
				const snapshotDate = new Date(Number(timestamp) * 1000).toISOString().split('T')[0]
				const response = await fetch(`${bucketUrl}/${snapshotDate}/claim-amounts.json`)

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
					const untrackedUsers = await prismaClient.user.findMany({
						select: {
							address: true,
							isTracked: true
						},
						where: {
							isTracked: false
						},
						skip,
						take
					})

					if (untrackedUsers.length === 0) break

					const untrackedUserAddresses = untrackedUsers.map((uu) => uu.address.toLowerCase())

					await processSnapshot(
						prismaClient,
						reader,
						untrackedUserAddresses,
						tokenPrices,
						BATCH_SIZE
					)

					skip += take
				}
			}

			// Mark all untracked users as tracked
			await prismaClient.user.updateMany({
				where: {
					isTracked: false
				},
				data: {
					isTracked: true
				}
			})
		}

		// All untracked users are now in-synced with tracked ones. Now seed data for timestamps after last seed for all users.
		for (const timestamp of timestampsForAllUsers) {
			const snapshotDate = new Date(Number(timestamp) * 1000).toISOString().split('T')[0]
			const response = await fetch(`${bucketUrl}/${snapshotDate}/claim-amounts.json`)

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
				const users = await prismaClient.user.findMany({
					select: {
						address: true,
						isTracked: true
					},
					skip,
					take
				})

				if (users.length === 0) break

				const userAddresses = users.map((uu) => uu.address.toLowerCase())

				await processSnapshot(prismaClient, reader, userAddresses, tokenPrices, BATCH_SIZE)

				skip += take
			}
		}

		// Update last synced time
		await prismaClient.settings.upsert({
			where: { key: timeSyncKey },
			update: { value: endAt.getTime() },
			create: { key: timeSyncKey, value: endAt.getTime() }
		})
	} catch {}
}

async function processSnapshot(
	prismaClient: prisma.PrismaClient,
	reader: ReadableStreamDefaultReader<Uint8Array>,
	userAddresses: string[],
	tokenPrices: Array<{ address: string; decimals: number }>,
	BATCH_SIZE: number
) {
	const latestMetricsFromDb = await getLatestMetricsFromDb(prismaClient, userAddresses)
	let stakerRewardList: Omit<prisma.MetricStakerRewardUnit, 'id'>[] = []
	let buffer = ''
	const decoder = new TextDecoder()

	try {
		while (true) {
			const { done, value } = await reader.read()

			if (done) {
				const line = buffer.trim()
				if (line) {
					processLine(line, userAddresses, stakerRewardList, latestMetricsFromDb, tokenPrices)
				}
				break
			}

			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split('\n')

			for (let i = 0; i < lines.length - 1; i++) {
				const line = lines[i].trim()
				if (line) {
					processLine(line, userAddresses, stakerRewardList, latestMetricsFromDb, tokenPrices)
				}

				if (stakerRewardList.length >= BATCH_SIZE) {
					await writeToDb(prismaClient, stakerRewardList)
					stakerRewardList = []
				}
			}

			buffer = lines[lines.length - 1]
		}

		if (stakerRewardList.length > 0) {
			await writeToDb(prismaClient, stakerRewardList)
		}
	} finally {
		reader.releaseLock()
	}
}

function processLine(
	line: string,
	addresses: string[],
	stakerRewardList: Omit<prisma.MetricStakerRewardUnit, 'id'>[],
	latestMetricsFromDb: {
		getLatestAmount: (address: string, token: string) => prisma.Prisma.Decimal
	},
	tokenPrices: Array<{ address: string; decimals: number }>
) {
	const data = JSON.parse(line) as ClaimData
	const earner = data.earner.toLowerCase()
	const token = data.token.toLowerCase()

	if (addresses.includes(earner)) {
		const tokenDecimals =
			tokenPrices.find((tp) => tp.address.toLowerCase() === token)?.decimals || 18

		const latestRecordInBatch = stakerRewardList
			.filter(
				(record) =>
					record.stakerAddress.toLowerCase() === earner &&
					record.tokenAddress.toLowerCase() === token
			)
			.reduce((latest, current) => {
				if (!latest || current.timestamp > latest.timestamp) {
					return current
				}
				return latest
			}, null as Omit<prisma.MetricStakerRewardUnit, 'id'> | null)

		// To calculate change, first check find latest cumulativeAmount value (from stakerRewardList, if not then from db)
		const lastCumulativeAmount = latestRecordInBatch
			? latestRecordInBatch.cumulativeAmount
			: latestMetricsFromDb.getLatestAmount(earner, token)

		const cumulativeAmount = new prisma.Prisma.Decimal(data.cumulative_amount).div(
			new prisma.Prisma.Decimal(10).pow(tokenDecimals)
		)

		stakerRewardList.push({
			stakerAddress: earner,
			tokenAddress: token,
			cumulativeAmount,
			changeCumulativeAmount: cumulativeAmount.sub(lastCumulativeAmount),
			timestamp: new Date(data.snapshot)
		})
	}
}

async function writeToDb(
	prismaClient: prisma.PrismaClient,
	batch: Omit<prisma.MetricStakerRewardUnit, 'id'>[]
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	// Add historical records to db
	dbTransactions.push(
		prismaClient.metricStakerRewardUnit.createMany({
			data: batch,
			skipDuplicates: true
		})
	)

	if (dbTransactions.length > 0) {
		await bulkUpdateDbTransactions(dbTransactions, `[Data] Staker Token Rewards: ${batch.length}`)
	}
}

function getBucketUrl(): string {
	return getNetwork().testnet
		? 'https://eigenlabs-rewards-testnet-holesky.s3.amazonaws.com/testnet/holesky'
		: 'https://eigenlabs-rewards-mainnet-ethereum.s3.amazonaws.com/mainnet/ethereum'
}

/**
 * Get first log timestamp
 *
 * @returns
 */
async function getFirstLogTimestamp() {
	const prismaClient = getPrismaClient()

	const firstLog = await prismaClient.eventLogs_DistributionRootSubmitted.findFirst({
		select: { rewardsCalculationEndTimestamp: true },
		orderBy: { rewardsCalculationEndTimestamp: 'asc' }
	})

	return firstLog?.rewardsCalculationEndTimestamp
		? new Date(Number(firstLog.rewardsCalculationEndTimestamp) * 1000)
		: null
}

/**
 * Get latest cumulativeAmount per token for a given set of addresses. Used to help calc changeCumulativeAmount.
 *
 * @param addresses
 * @returns
 */
async function getLatestMetricsFromDb(prismaClient: prisma.PrismaClient, addresses: string[]) {
	// First get the latest timestamp for each staker/token combination
	const latestMetrics = await prismaClient.metricStakerRewardUnit.findMany({
		where: {
			stakerAddress: {
				in: addresses
			}
		},
		orderBy: {
			timestamp: 'desc'
		},
		distinct: ['stakerAddress', 'tokenAddress'],
		select: {
			stakerAddress: true,
			tokenAddress: true,
			cumulativeAmount: true
		}
	})

	const metricsMap = new Map<string, prisma.Prisma.Decimal>()

	for (const metric of latestMetrics) {
		const key = `${metric.stakerAddress.toLowerCase()}-${metric.tokenAddress.toLowerCase()}`
		metricsMap.set(key, metric.cumulativeAmount)
	}

	return {
		getLatestAmount: (address: string, token: string) => {
			const key = `${address.toLowerCase()}-${token.toLowerCase()}`
			return metricsMap.get(key) ?? new prisma.Prisma.Decimal(0)
		}
	}
}
