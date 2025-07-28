import { cacheStore } from 'route-cache'
import { getPrismaClient } from './prismaClient'

type BaseApy = {
	poolId: string
	strategyAddress: string
	tokenAddress: string
	apy: number
}

export async function fetchBaseApys(): Promise<BaseApy[]> {
	const prismaClient = getPrismaClient()

	// Fetch strategy metadata
	const strategies = await prismaClient.strategies.findMany({
		select: {
			address: true,
			underlyingToken: true
		}
	})

	// Fetch token metadata for dlPoolId
	const underlyingTokenAddresses = strategies.map((s) => s.underlyingToken.toLowerCase())
	const tokens = await prismaClient.tokens.findMany({
		where: {
			address: {
				in: underlyingTokenAddresses
			}
		},
		select: {
			address: true,
			dlPoolId: true
		}
	})

	// Map tokens by address for quick lookup
	const tokenPoolIdMap = new Map(tokens.map((t) => [t.address.toLowerCase(), t.dlPoolId]))

	const baseApys: BaseApy[] = []
	const minHours = 12 // Minimum TTL in hours
	const maxHours = 24 // Maximum TTL in hours

	// Process each strategy
	for (const strategy of strategies) {
		const dlPoolId = tokenPoolIdMap.get(strategy.underlyingToken.toLowerCase())
		if (!dlPoolId) {
			// No pool ID, use default APY
			baseApys.push({
				poolId: tokenPoolIdMap.get(strategy.underlyingToken.toLowerCase()) || '',
				strategyAddress: strategy.address,
				tokenAddress: strategy.underlyingToken.toLowerCase(),
				apy: 0
			})
			continue
		}

		const cacheKey = `apy_${strategy.address}`
		const cachedApy = await cacheStore.get(cacheKey)

		if (cachedApy !== undefined && cachedApy !== null) {
			// Cache hit
			baseApys.push({
				poolId: tokenPoolIdMap.get(strategy.underlyingToken.toLowerCase()) || '',
				strategyAddress: strategy.address,
				tokenAddress: strategy.underlyingToken.toLowerCase(),
				apy: cachedApy
			})
			continue
		}

		// Cache miss: fetch APY from DeFi Llama
		try {
			const response = await fetch(`https://yields.llama.fi/chart/${dlPoolId}`)

			if (!response.ok) {
				throw new Error(`DeFi Llama API error for pool ${dlPoolId}: ${response.statusText}`)
			}

			const data = await response.json()
			if (data.status !== 'success' || !data.data || !data.data.length) {
				throw new Error(`Invalid APY data for pool ${dlPoolId}: ${JSON.stringify(data)}`)
			}

			const latestEntry = data.data[data.data.length - 1]
			const apyBase = Number(latestEntry.apyBase) || 0

			// Cache APY with random TTL
			const randomHour = Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours // Random hour: 12 to 24
			const ttlMillis = randomHour * 3_600_000 // Convert hours to milliseconds
			await cacheStore.set(cacheKey, apyBase, ttlMillis)

			baseApys.push({
				poolId: dlPoolId,
				strategyAddress: strategy.address,
				tokenAddress: strategy.underlyingToken.toLowerCase(),
				apy: apyBase
			})
		} catch (error) {
			console.error(`Error fetching APY for pool ${dlPoolId}:`, error)
			baseApys.push({
				poolId: dlPoolId || '',
				strategyAddress: strategy.address,
				tokenAddress: strategy.underlyingToken.toLowerCase(),
				apy: 0
			})
		}
	}

	return baseApys
}
