import { cacheStore } from 'route-cache'
import { getTimestamp } from '../routes/metrics/metricController'

export type CirculatingSupply = {
	current_circulating_supply: number
}

export type CirculatingSupplyWithChange = {
	current_circulating_supply: number
	supply_24h_ago: number
	supply_7d_ago: number
}

export async function fetchEthCirculatingSupply(
	withChange: boolean
): Promise<CirculatingSupply | CirculatingSupplyWithChange> {
	const CMC_API = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'
	const CMC_HISTORICAL_API =
		'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/historical?symbol=ETH'

	let currentSupply = await cacheStore.get('eth_circulating_supply_current')

	if (!currentSupply) {
		try {
			const response = await fetch(`${CMC_API}?symbol=ETH`, {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY! }
			})

			if (!response.ok)
				throw new Error(`Failed to fetch current ETH supply: ${response.statusText}`)

			const payload = await response.json()
			currentSupply = payload.data.ETH[0].circulating_supply

			await cacheStore.set('eth_circulating_supply_current', currentSupply, 86_400_000) // Cache for 24 hours
		} catch (error) {
			console.error('Error fetching current ETH supply:', error)
			throw error
		}
	}

	if (!withChange) {
		return {
			current_circulating_supply: currentSupply
		}
	}

	let supply24hAgo = await cacheStore.get('eth_circulating_supply_24h_ago')
	let supply7dAgo = await cacheStore.get('eth_circulating_supply_7d_ago')

	if (!supply24hAgo || !supply7dAgo) {
		try {
			// Fetch the last 7 days of data using `interval=1d`
			const response = await fetch(`${CMC_HISTORICAL_API}&interval=1d&count=7`, {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY! }
			})

			if (!response.ok)
				throw new Error(`Failed to fetch historical ETH supply: ${response.statusText}`)

			const payload = await response.json()
			const historicalQuotes = payload.data.ETH[0].quotes

			if (historicalQuotes.length > 0) {
				supply7dAgo = historicalQuotes[0].quote.USD.circulating_supply
				supply24hAgo = historicalQuotes[historicalQuotes.length - 1].quote.USD.circulating_supply
			}

			if (supply24hAgo)
				await cacheStore.set('eth_circulating_supply_24h_ago', supply24hAgo, 86_400_000)
			if (supply7dAgo)
				await cacheStore.set('eth_circulating_supply_7d_ago', supply7dAgo, 86_400_000)
		} catch (error) {
			console.error('Error fetching historical ETH supply:', error)
			throw error
		}
	}

	return {
		current_circulating_supply: currentSupply,
		supply_24h_ago: supply24hAgo,
		supply_7d_ago: supply7dAgo
	}
}
