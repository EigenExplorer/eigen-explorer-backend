import { cacheStore } from 'route-cache'

export async function getBlockNumberFromDate(date: Date, chainId: number) {
	const timestamp = Math.floor(date.getTime() / 1000)
	const cacheKey = `block_${timestamp}`
	const cachedValue = await cacheStore.get(cacheKey)

	if (cachedValue) {
		return cachedValue.height
	}

	const response =
		chainId === 1
			? await fetch(`https://coins.llama.fi/block/ethereum/${timestamp}`)
			: await fetch(`https://coins.llama.fi/block/holesky/${timestamp}`)

	if (!response.ok) {
		throw new Error('Failed to fetch block number from date')
	}

	const data = await response.json()
	await cacheStore.set(cacheKey, data, 120_000) // Cache for 2 minutes (120,000 milliseconds)

	return data.height
}
