import { getPrismaClient } from '../utils/prismaClient'

export async function getSharesToUnderlying() {
	const strategiesData = await getPrismaClient().strategies.findMany({
		select: {
			address: true,
			sharesToUnderlying: true
		}
	})

	const sharesToUnderlying = new Map<string, string>()
	for (const strategy of strategiesData) {
		const sharesValue = BigInt(strategy.sharesToUnderlying)

		const normalizedValue =
			strategy.sharesToUnderlying.length < 20
				? sharesValue / BigInt(1e18)
				: sharesValue / BigInt(1e32)

		sharesToUnderlying.set(strategy.address.toLowerCase(), normalizedValue.toString())
	}

	sharesToUnderlying.set('0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0', '1')

	return sharesToUnderlying
}

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
