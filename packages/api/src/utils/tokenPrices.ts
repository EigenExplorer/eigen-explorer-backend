import {
	EigenStrategiesContractAddress,
	getEigenContracts
} from '../data/address'

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

	const response = await fetch(
		`${CMC_API}?symbol=${keys.join(',')}&convert=eth`,
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		{ headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY! } }
	)
	const payload = await response.json()
	const quotes = Object.keys(payload.data)

	keys.map((k) => {
		const quoteKey = quotes.find((q) => q.toLowerCase() === k.toLowerCase())

		tokenPrices[k] = {
			symbol: k,
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			strategyAddress: getEigenContracts().Strategies[k]!.strategyContract,
			eth: quoteKey ? payload.data[quoteKey].quote.ETH.price : 0
		}
	})

	return tokenPrices
}
