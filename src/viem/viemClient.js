import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

let publicViemClient;

if (!global.publicViemClient) {
    global.publicViemClient = createPublicClient({
        chain: mainnet,
        transport: http(),
    });
}

publicViemClient = global.publicViemClient;

export default publicViemClient;
