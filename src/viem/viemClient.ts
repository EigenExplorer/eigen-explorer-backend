import { PublicClient, createPublicClient, http, webSocket } from 'viem'
import { mainnet } from 'viem/chains'

let publicViemClient: PublicClient

if (!(global as any).publicViemClient) {
	;(global as any).publicViemClient = createPublicClient({
		transport: process.env.RPC_WSS_URL
			? webSocket(process.env.RPC_WSS_URL)
			: http(mainnet.rpcUrls.default.http[0])
	})
}

publicViemClient = (global as any).publicViemClient

export default publicViemClient
