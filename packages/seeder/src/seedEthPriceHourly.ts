import 'dotenv/config'

import type prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'

const tokens: { [key: string]: string } = {
	cbETH: 'coinbase-wrapped-staked-eth',
	stETH: 'staked-ether',
	rETH: 'rocket-pool-eth',
	ETHx: 'stader-ethx',
	ankrETH: 'ankreth',
	oETH: 'origin-ether',
	osETH: 'stakewise-v3-oseth',
	swETH: 'sweth',
	wBETH: 'wrapped-beacon-eth',
	sfrxETH: 'staked-frax-ether',
	lsETH: 'liquid-staked-ethereum',
	mETH: 'mantle-staked-ether'
}

export async function seedEthPriceHourly() {
	const prismaClient = getPrismaClient()
	const apiKey = process.env.CG_API_KEY

	console.time('Done in')

	const ethPriceHourlyList: prisma.EthPriceHourly[] = []

	for (const [tokenName, apiId] of Object.entries(tokens)) {
		const startAt = setToStartOfHour(await getLastUpdate(tokenName))
		const endAt = setToStartOfHour(new Date())

		// Bail early if there is no time diff to sync
		if (endAt.getTime() / 1000 - startAt.getTime() / 1000 <= 24 * 60 * 60) {
			console.log(
				`[In Sync] [Data] ${tokenName} Price from: ${startAt.getTime()} to: ${endAt.getTime()}`
			)
			continue
		}

		try {
			const response = await fetch(
				`https://api.coingecko.com/api/v3/coins/${apiId}/market_chart/range?vs_currency=eth&from=${
					startAt.getTime() / 1000
				}&to=${endAt.getTime() / 1000}`,
				{
					method: 'GET',
					headers: {
						Authorization: `${apiKey}`
					}
				}
			)

			if (!response.ok) {
				throw new Error(`HTTP error: ${response.status}`)
			}

			const payload = await response.json()
			const prices = payload.prices || []
			for (const price of prices) {
				const [timestamp, ethPrice] = price
				ethPriceHourlyList.push({
					tokenName,
					price: ethPrice,
					timestamp: new Date(timestamp)
				})
			}

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const dbTransactions: any[] = []

			dbTransactions.push(
				prismaClient.ethPriceHourly.createMany({
					data: ethPriceHourlyList
				})
			)

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Data] Eth Price Hourly size: ${ethPriceHourlyList.length}`
			)
		} catch (error) {
			console.log('Error seeding Eth prices: ', error)
		}
		await new Promise((resolve) => setTimeout(resolve, 20 * 1000)) // wait 20s to avoid rate limits
	}
}

async function getLastUpdate(tokenName: string) {
	const prismaClient = getPrismaClient()

	const latestRecord = await prismaClient.ethPriceHourly.findFirst({
		where: { tokenName },
		select: { timestamp: true },
		orderBy: { timestamp: 'desc' }
	})

	return latestRecord
		? latestRecord.timestamp + 24 * 60 * 60 * 1000
		: new Date(new Date().getTime() - 364 * 24 * 60 * 60 * 1000)
}

function setToStartOfHour(date: Date) {
	const hourlyDate = new Date(date)
	hourlyDate.setMinutes(0, 0, 0)
	return hourlyDate
}
