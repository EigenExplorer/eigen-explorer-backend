import {
	EigenStrategiesContractAddress,
	getEigenContracts
} from '../data/address'

import { cacheStore } from 'route-cache'

type Tokens = keyof EigenStrategiesContractAddress

type TokenPrice = {
	symbol: string
	strategyAddress: string
	eth: number
	usd?: number
}

export type TokenPrices = {
	[key in Tokens]?: TokenPrice
}

export async function fetchStrategyTokenPrices(): Promise<TokenPrices> {
	const tokenPrices: TokenPrices = {}

	const CMC_API =
		'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest'

	const keys = Object.keys(getEigenContracts().Strategies) as Tokens[]
	const keysStr = keys.join(',')

	const cachedValue = await cacheStore.get(`price_${keysStr}`)

	if (cachedValue) {
		return cachedValue
	}

	const response = await fetch(
		`${CMC_API}?symbol=${keysStr}&convert=eth`,
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		{ headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY! } }
	)
	const payload = await response.json()
	const quotes = Object.keys(payload.data)

	keys.map((k) => {
		const quoteKey = quotes.find((q) => q.toLowerCase() === k.toLowerCase())
		const price = {
			symbol: k,
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			strategyAddress: getEigenContracts().Strategies[k]!.strategyContract,
			eth: quoteKey ? payload.data[quoteKey].quote.ETH.price : 0
		}

		tokenPrices[k] = price
	})

	await cacheStore.set(`price_${keysStr}`, tokenPrices, 120_000)

	return tokenPrices
}
