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

/**
 * Function to get the strategy balance
 *
 * @param strategyProxyContractAddr
 * @param tokenProxyContractAddr
 * @param tokenImplementationAbi
 */
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

/**
 * Route to get a single strategy's TVL
 *
 * @param req
 * @param res
 */
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

            res.status(200).send(strategyTvl);
        });
    } catch (error) {
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

/**
 * Route to get total TVL from all strategies
 *
 * @param req
 * @param res
 */
export async function getTotalTvl(req: Request, res: Response) {
    try {
        // Initialize an array to hold promises for fetching each strategy's TVL
        const tvlPromises: Promise<string>[] = [];

        // Iterate over each strategy to prepare TVL fetch promises
        for (const strategyName in eigenLayerMainnetStrategyContracts) {
            const strategyContract =
                eigenLayerMainnetStrategyContracts[strategyName];

            // Import the strategy ABI dynamically based on the strategyName
            const strategyAbiPath = abiPath[strategyName.toLowerCase()];
            const abiModulePromise = import(strategyAbiPath);

            // Create a promise to fetch the strategy's TVL
            const tvlPromise = abiModulePromise.then(async (abiModule) => {
                // Extract the ABI, assuming the ABI is the first export of the module
                const abi = Object.values(abiModule)[0];
                return getStrategyBalance(
                    strategyContract.strategyContract,
                    strategyContract.tokenContract,
                    abi
                );
            });

            // Add the promise to the array
            tvlPromises.push(tvlPromise);
        }

        // Use Promise.all to fetch all TVLs concurrently
        const tvls = await Promise.all(tvlPromises);

        // Sum up all the TVLs to get the total TVL
        const totalTvl = tvls.reduce((acc, tvl) => acc + parseFloat(tvl), 0);

        res.send(totalTvl.toString());
    } catch (error) {
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}
