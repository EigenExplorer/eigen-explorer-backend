import { getPrismaClient } from '../utils/prismaClient'

export async function getEthPrices(timestamp: number) {
	return await getPrismaClient().ethPricesDaily.findMany({
		where: {
			timestamp: {
				gte: new Date(timestamp)
			}
		},
		orderBy: {
			timestamp: 'desc'
		}
	})
}

export async function getStrategyToSymbolMap() {
	const strategiesData = await getPrismaClient().strategies.findMany({
		select: {
			address: true,
			symbol: true
		}
	})

	const strategiesToSymbolMap = new Map<string, string>()
	for (const strategy of strategiesData) {
		strategiesToSymbolMap.set(strategy.address.toLowerCase(), strategy.symbol)
	}

	return strategiesToSymbolMap
}
