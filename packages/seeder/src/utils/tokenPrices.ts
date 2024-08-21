import {
	EigenStrategiesContractAddress,
	getEigenContracts
} from '../data/address'

import NodeCache from 'node-cache'

const cacheStore = new NodeCache()

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

	const CMC_TOKEN_IDS = [
		8100, 21535, 27566, 23782, 29035, 24277, 28476, 15060, 23177, 8085, 25147,
		24760, 2396
	]

	const CMC_API =
		'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest'

	const keys = Object.keys(getEigenContracts().Strategies) as Tokens[]
	const keysStr = CMC_TOKEN_IDS.join(',')

	const cachedValue = cacheStore.get(`price_${keysStr}`)

	if (cachedValue) {
		return cachedValue
	}

	const response = await fetch(
		`${CMC_API}?id=${keysStr}&convert=eth`,
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		{ headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY! } }
	)
	const payload = await response.json()
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const quotes = Object.values(payload.data) as any[]

	keys.map((k) => {
		const quoteKey = quotes.find(
			(q) => q.symbol.toLowerCase() === k.toLowerCase()
		)
		const price = {
			symbol: k,
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			strategyAddress: getEigenContracts().Strategies[k]!.strategyContract,
			eth: quoteKey ? payload.data[quoteKey.id].quote.ETH.price : 0
		}

		tokenPrices[k] = price
	})

	cacheStore.set(`price_${keysStr}`, tokenPrices, 120)

	return tokenPrices
}
