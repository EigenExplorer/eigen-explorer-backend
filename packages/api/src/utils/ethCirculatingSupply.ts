import { cacheStore } from 'route-cache'

type CirculatingSupply = {
	current_circulating_supply: number
	supply_24h_ago: number
	supply_7d_ago: number
}

export async function fetchEthCirculatingSupply(): Promise<CirculatingSupply> {
	const CMC_API =
		'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
	const CMC_HISTORICAL_API =
		'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/historical'

	const cachedCurrent = await cacheStore.get('eth_circulating_supply_current')
	const cached24hAgo = await cacheStore.get('eth_circulating_supply_24h_ago')
	const cached7dAgo = await cacheStore.get('eth_circulating_supply_7d_ago')

	let currentSupply = cachedCurrent
	let supply24hAgo = cached24hAgo
	let supply7dAgo = cached7dAgo

	const timestampNow = new Date()

	if (!currentSupply) {
		const responseCurrent = await fetch(`${CMC_API}?symbol=ETH`, {
			headers: {
				'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY!
			}
		})
		const payloadCurrent = await responseCurrent.json()
		currentSupply = payloadCurrent.data.ETH[0].circulating_supply
		await cacheStore.set(
			'eth_circulating_supply_current',
			currentSupply,
			86_400_000
		)
	}

	if (!supply24hAgo) {
		const timestamp24h = new Date(
			new Date().setUTCHours(timestampNow.getUTCHours() - 24)
		)

		const response24hAgo = await fetch(
			`${CMC_HISTORICAL_API}?date=${timestamp24h}`,
			{
				headers: {
					'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY!
				}
			}
		)
		const payload24hAgo = await response24hAgo.json()
		supply24hAgo = payload24hAgo.data[1].circulating_supply
		await cacheStore.set(
			'eth_circulating_supply_24h_ago',
			supply24hAgo,
			86_400_000
		)
	}

	if (!supply7dAgo) {
		const timestamp7d = new Date(
			new Date().setUTCDate(timestampNow.getUTCDate() - 7)
		)

		const response7dAgo = await fetch(
			`${CMC_HISTORICAL_API}?date=${timestamp7d}`,
			{
				headers: {
					'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY!
				}
			}
		)
		const payload7dAgo = await response7dAgo.json()
		supply7dAgo = payload7dAgo.data[1].circulating_supply
		await cacheStore.set(
			'eth_circulating_supply_7d_ago',
			supply7dAgo,
			86_400_000
		)
	}

	return {
		current_circulating_supply: currentSupply,
		supply_24h_ago: supply24hAgo,
		supply_7d_ago: supply7dAgo
	}
}
