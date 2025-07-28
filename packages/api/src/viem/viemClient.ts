import { type PublicClient, createPublicClient, http } from 'viem'
import { type Chain, holesky, mainnet, sepolia } from 'viem/chains'

let publicViemClient: PublicClient
let network: Chain = mainnet

if (process.env.NETWORK) {
	switch (process.env.NETWORK) {
		case 'holesky':
			network = holesky
			break
		case 'sepolia':
			network = sepolia
			break
	}
}

/**
 * Return the selected network
 *
 * @returns
 */
export function getNetwork() {
	return network
}

/**
 * Get the initialized viem client
 *
 * @returns
 */
export function getViemClient(n?: Chain) {
	if (n) {
		network = n
	}

	if (!publicViemClient) {
		publicViemClient = createPublicClient({
			cacheTime: 120_000,
			batch: {
				multicall: true
			},
			transport: process.env.NETWORK_CHAIN_RPC_URL
				? http(process.env.NETWORK_CHAIN_RPC_URL)
				: http(network.rpcUrls.default.http[0])
		})
	}

	return publicViemClient
}

// ====================== DEPRECATED ======================
// biome-ignore lint/suspicious/noExplicitAny:
if (!(global as any).publicViemClient) {
	// biome-ignore lint/suspicious/noExplicitAny:
	;(global as any).publicViemClient = createPublicClient({
		cacheTime: 10_000,
		batch: {
			multicall: true
		},
		transport: process.env.NETWORK_CHAIN_RPC_URL
			? http(process.env.NETWORK_CHAIN_RPC_URL)
			: http(network.rpcUrls.default.http[0])
	})
}

// biome-ignore lint/suspicious/noExplicitAny:
publicViemClient = (global as any).publicViemClient

export default publicViemClient
// ====================== DEPRECATED ======================
