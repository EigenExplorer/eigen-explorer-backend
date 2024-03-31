import { PublicClient, createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

let publicViemClient: PublicClient

if (!(global as any).publicViemClient) {
	;(global as any).publicViemClient = createPublicClient({
		chain: mainnet,
		transport: http()
	})
}

publicViemClient = (global as any).publicViemClient

export default publicViemClient
