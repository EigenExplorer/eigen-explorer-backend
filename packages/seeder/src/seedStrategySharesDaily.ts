import 'dotenv/config'

import type prisma from '@prisma/client'
import { strategyAbi } from './data/abi/strategy'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'
import { getViemClient } from './utils/viemClient'

export async function seedStrategySharesDaily() {
	const prismaClient = getPrismaClient()
	const viemClient = getViemClient()

	console.time('Done in')

	const startAt = await getLastUpdate()
	const endAt = setToStartOfDay(new Date())

	const strategySharesDailyList: Omit<prisma.StrategySharesDaily, 'id'>[] = []

	// Bail early if there is no time diff to sync
	if (endAt.getTime() - startAt.getTime() <= 0) {
		console.log(
			`[In Sync] [Data] Strategy Shares Daily from: ${startAt.getTime()} to: ${endAt.getTime()}`
		)
		return
	}

	try {
		// Get all strategies from the database
		const strategies = await prismaClient.strategies.findMany()

		// For each day between startAt and endAt, capture strategy shares
		const currentDate = new Date(startAt)
		while (currentDate < endAt) {
			const dayTimestamp = setToStartOfDay(new Date(currentDate))

			// For each strategy, get the current sharesToUnderlying rate
			for (const strategy of strategies) {
				const strategyAddress = strategy.address.toLowerCase()
				let sharesToUnderlying = strategy.sharesToUnderlying || '1000000000000000000' // Default 1e18

				try {
					// Read current exchange rate from strategy contract
					const rate = (await viemClient.readContract({
						address: strategyAddress as `0x${string}`,
						abi: strategyAbi,
						functionName: 'sharesToUnderlyingView',
						args: [BigInt(1e18)]
					})) as bigint

					sharesToUnderlying = rate.toString()
				} catch (error) {
					// Use fallback from database if contract call fails
					console.warn(`Failed to read sharesToUnderlying for strategy ${strategyAddress}:`, error)
				}

				strategySharesDailyList.push({
					strategyAddress,
					tokenAddress: strategy.underlyingToken.toLowerCase(),
					sharesToUnderlying,
					timestamp: dayTimestamp
				})
			}

			// Move to next day
			currentDate.setDate(currentDate.getDate() + 1)
		}

		// Save to database
		if (strategySharesDailyList.length > 0) {
			const dbTransactions: any[] = []

			dbTransactions.push(
				prismaClient.strategySharesDaily.createMany({
					data: strategySharesDailyList,
					skipDuplicates: true
				})
			)

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Data] Strategy Shares Daily size: ${strategySharesDailyList.length}`
			)
		}
	} catch (error) {
		console.log('Error seeding Strategy Shares Daily: ', error)
	}

	console.timeEnd('Done in')
}

async function getLastUpdate() {
	const prismaClient = getPrismaClient()
	const minimumStartAt = setToStartOfDay(new Date())
	minimumStartAt.setMonth(minimumStartAt.getMonth() - 1)
	minimumStartAt.setDate(minimumStartAt.getDate() + 1)

	const latestRecord = await prismaClient.strategySharesDaily.findFirst({
		select: { timestamp: true },
		orderBy: { timestamp: 'desc' }
	})

	return (latestRecord && latestRecord.timestamp.getTime() <= minimumStartAt.getTime()) ||
		!latestRecord
		? minimumStartAt
		: latestRecord.timestamp
}

function setToStartOfDay(date: Date) {
	const dailyDate = new Date(date)
	dailyDate.setUTCHours(0, 0, 0, 0)
	return dailyDate
}
