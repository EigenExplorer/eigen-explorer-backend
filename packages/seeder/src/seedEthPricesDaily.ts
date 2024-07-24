import 'dotenv/config'

import type prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'

const CMC_API =
	'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/historical'
const apiKey = process.env.CMC_API_KEY
const CMC_TOKEN_IDS = [
	8100, 21535, 27566, 23782, 29035, 24277, 28476, 15060, 23177, 8085, 25147,
	24760, 2396
]
const keysStr = CMC_TOKEN_IDS.join(',')

export async function seedEthPricesDaily() {
	const prismaClient = getPrismaClient()

	console.time('Done in')

	const startAt = await getLastUpdate()
	const endAt = setToStartOfDay(new Date())

	const ethPricesDailyList: Omit<prisma.EthPricesDaily, 'id'>[] = []

	// Bail early if there is no time diff to sync
	if (endAt.getTime() - startAt.getTime() <= 0) {
		console.log(
			`[In Sync] [Data] Eth Prices from: ${startAt.getTime()} to: ${endAt.getTime()}`
		)
		return
	}

	try {
		const response = await fetch(
			`${CMC_API}?id=${keysStr}&convert=eth&interval=daily&time_start=${startAt.toISOString()}&time_end=${endAt.toISOString()}`,
			{
				headers: { 'X-CMC_PRO_API_KEY': `${apiKey}` }
			}
		)
		const payload = await response.json()

		for (const tokenId in payload.data) {
			const token = payload.data[tokenId]
			const symbol = token.symbol
			for (const quote of token.quotes) {
				ethPricesDailyList.push({
					symbol,
					ethPrice: quote.quote.ETH.price,
					timestamp: new Date(quote.timestamp)
				})
			}
		}

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []

		dbTransactions.push(
			prismaClient.ethPricesDaily.createMany({
				data: ethPricesDailyList
			})
		)

		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Data] Eth Prices Daily size: ${ethPricesDailyList.length}`
		)
	} catch (error) {
		console.log('Error seeding Eth prices: ', error)
	}
}

async function getLastUpdate() {
	const prismaClient = getPrismaClient()
	const minimumStartAt = setToStartOfDay(new Date())
	minimumStartAt.setMonth(minimumStartAt.getMonth() - 1)
	minimumStartAt.setDate(minimumStartAt.getDate() + 1)

	const latestRecord = await prismaClient.ethPricesDaily.findFirst({
		select: { timestamp: true },
		orderBy: { timestamp: 'desc' }
	})

	return (latestRecord &&
		latestRecord.timestamp.getTime() <= minimumStartAt.getTime()) ||
		!latestRecord
		? minimumStartAt
		: latestRecord.timestamp
}

function setToStartOfDay(date: Date) {
	const dailyDate = new Date(date)
	dailyDate.setUTCHours(0, 0, 0, 0)
	return dailyDate
}
