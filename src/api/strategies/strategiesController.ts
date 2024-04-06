import { Request, Response } from 'express';
import { formatEther } from 'viem';
import publicViemClient from '../../viem/viemClient';
import { eigenLayerMainnetStrategyContracts } from '../../data/address/eigenMainnetContracts';

// ABI path for dynamic imports
const abiPath = {
    cbeth: '../../data/abi/cbEthAbi',
    steth: '../../data/abi/stEthAbi',
    reth: '../../data/abi/rEthAbi',
    ethx: '../../data/abi/ethXAbi',
    ankreth: '../../data/abi/ankrEthAbi',
    oeth: '../../data/abi/oEthAbi',
    oseth: '../../data/abi/osEthAbi',
    sweth: '../../data/abi/swEthAbi',
    wbeth: '../../data/abi/wbEthAbi',
    sfrxeth: '../../data/abi/sfrxEthAbi',
    lseth: '../../data/abi/lsEthAbi',
    meth: '../../data/abi/mEthAbi',
};

async function getStrategyBalance(
    strategyProxyContractAddr: string,
    tokenProxyContractAddr: string,
    tokenImplementationAbi: any
) {
    const data = (await publicViemClient.readContract({
        address: tokenProxyContractAddr as `0x${string}`,
        abi: tokenImplementationAbi,
        functionName: 'balanceOf',
        args: [strategyProxyContractAddr],
    })) as bigint;

    const formatedData = formatEther(data);

    return formatedData;
}

export async function getStrategyTvl(req: Request, res: Response) {
    try {
        // Get the strategy name from the request parameters
        const strategyName = req.params.strategyName;

        // Check if the strategy name is provided
        if (!strategyName) {
            return res.status(400).send('Strategy name is required.');
        }

        // Format strategy name to lowercase
        const strategyNameLowerCase = strategyName.toLowerCase();

        // Convert the keys in contracts object to lowercase
        const mainnetStrategyContractsLowerCase = {};
        for (const key in eigenLayerMainnetStrategyContracts) {
            mainnetStrategyContractsLowerCase[key.toLowerCase()] =
                eigenLayerMainnetStrategyContracts[key];
        }

        // Check if the strategy name is valid and get the strategy contract
        const strategyContract =
            mainnetStrategyContractsLowerCase[strategyNameLowerCase];
        if (!strategyContract) {
            return res.status(404).send('Strategy not found.');
        }

        // Import the strategy ABI then get the strategy balance

        import(abiPath[strategyNameLowerCase]).then(async (abiModule) => {
            // Hack to avoid getting abi by strategy name (can cause error due to capitalization)
            const abi = Object.values(abiModule)[0];
            const strategyTvl = await getStrategyBalance(
                strategyContract.strategyContract,
                strategyContract.tokenContract,
                abi
            );

            res.send(strategyTvl);
        });
    } catch (error) {
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}
