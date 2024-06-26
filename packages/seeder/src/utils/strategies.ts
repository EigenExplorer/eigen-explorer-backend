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

		sharesToUnderlying.set(
			strategy.address.toLowerCase(),
			normalizedValue.toString()
		)
	}

	return sharesToUnderlying
}

export async function getEthPrices() {
	const strategiesData = await getPrismaClient().strategies.findMany({
		select: {
			address: true
		}
	})

	const ethPrices = new Map<string, number>()

	for (const strategy of strategiesData) {
		ethPrices.set(strategy.address.toLowerCase(), 1)
	}

	return ethPrices
}
