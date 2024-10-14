import NodeCache from 'node-cache'
import { getPrismaClient } from './prismaClient'

const cacheStore = new NodeCache({ stdTTL: 240 })

type TokenPrice = {
	id: number
	address: string
	symbol: string
	ethPrice: number
}

export async function fetchTokenPrices(): Promise<TokenPrice[]> {
	const prismaClient = getPrismaClient()

	const tokenPrices: TokenPrice[] = []
	const tokens = await prismaClient.tokens.findMany()
	const cmcTokenIds = tokens.map((t) => t.cmcId)

	const CMC_API = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest'

	const keysStr = cmcTokenIds.join(',')

	const cachedValue = await cacheStore.get<TokenPrice[]>(`price_${keysStr}`)

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

	tokens.map((t) => {
		const quoteKey = quotes.find((q) => q.id === t.cmcId)

		tokenPrices.push({
			id: t.cmcId,
			address: t.address,
			symbol: quoteKey.symbol,
			ethPrice: quoteKey ? quoteKey.quote.ETH.price : 0
		})
	})

	cacheStore.set(`price_${keysStr}`, tokenPrices, 120_000)

	return tokenPrices
}
