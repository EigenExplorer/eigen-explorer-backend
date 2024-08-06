import type Prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { getEigenContracts } from '../data/address/index'

export async function fetchCurrentEthPrices() {
	const prisma = getPrismaClient()

	const latestTimestamps = await prisma.ethPricesDaily.groupBy({
		by: ['symbol'],
		_max: {
			timestamp: true
		}
	})

	const latestPrices = await prisma.ethPricesDaily.findMany({
		where: {
			OR: latestTimestamps.map((price) => ({
				symbol: price.symbol,
				timestamp: price._max.timestamp
			})) as Prisma.Prisma.EthPricesDailyWhereInput[]
		},
		orderBy: {
			symbol: 'asc'
		}
	})

	const eigenContracts = getEigenContracts()
	const strategyPriceMap = new Map<string, number>()

	for (const price of latestPrices) {
		const strategy = Object.entries(eigenContracts.Strategies).find(
			([key]) => key.toLowerCase() === price.symbol.toLowerCase()
		)

		if (strategy) {
			const [_, { strategyContract }] = strategy
			strategyPriceMap.set(strategyContract, Number(price.ethPrice))
		}
	}

	strategyPriceMap.set('0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0', 1)

	return strategyPriceMap
}
