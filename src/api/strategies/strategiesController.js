import { formatEther } from 'viem';
import publicViemClient from '../../viem/viemClient.js';
import { eigenLayerMainnetStrategyContracts } from '../../data/address/eigenMainnetContracts.js';

// ABI Imports
import { cbEthAbi } from '../../data/abi/cbEthAbi.js';
import { stEthAbi } from '../../data/abi/stEthAbi.js';
import { rEthAbi } from '../../data/abi/rEthAbi.js';
import { ethXAbi } from '../../data/abi/ethXAbi.js';
import { ankrEthAbi } from '../../data/abi/ankrEthAbi.js';
import { oEthAbi } from '../../data/abi/oEthAbi.js';
import { osEthAbi } from '../../data/abi/osEthAbi.js';
import { swEthAbi } from '../../data/abi/swEthAbi.js';
import { wbEthAbi } from '../../data/abi/wbEthAbi.js';
import { sfrxEthAbi } from '../../data/abi/sfrxEthAbi.js';
import { lsEthAbi } from '../../data/abi/lsEthAbi.js';
import { mEthAbi } from '../../data/abi/mEthAbi.js';

async function getStrategyBalance(
    strategyProxyContractAddr,
    tokenProxyContractAddr,
    tokenImplementationAbi
) {
    const data = await publicViemClient.readContract({
        address: tokenProxyContractAddr,
        abi: tokenImplementationAbi,
        functionName: 'balanceOf',
        args: [strategyProxyContractAddr],
    });

    const formatedData = formatEther(data);

    return formatedData;
}

export async function getCbEthTvl(req, res) {
    try {
        const cbEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.cbETH.strategyContract,
            eigenLayerMainnetStrategyContracts.cbETH.tokenContract,
            cbEthAbi
        );
        res.send(cbEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getStEthTvl(req, res) {
    try {
        const stEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.stETH.strategyContract,
            eigenLayerMainnetStrategyContracts.stETH.tokenContract,
            stEthAbi
        );
        res.send(stEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getREthTvl(req, res) {
    try {
        const rEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.rETH.strategyContract,
            eigenLayerMainnetStrategyContracts.rETH.tokenContract,
            rEthAbi
        );
        res.send(rEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getEthXTvl(req, res) {
    try {
        const ethXTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.ETHx.strategyContract,
            eigenLayerMainnetStrategyContracts.ETHx.tokenContract,
            ethXAbi
        );
        res.send(ethXTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getAnkrEthTvl(req, res) {
    try {
        const ankrEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.ankrETH.strategyContract,
            eigenLayerMainnetStrategyContracts.ankrETH.tokenContract,
            ankrEthAbi
        );
        res.send(ankrEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getOEthTvl(req, res) {
    try {
        const oEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.oETH.strategyContract,
            eigenLayerMainnetStrategyContracts.oETH.tokenContract,
            oEthAbi
        );
        res.send(oEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getOsEthTvl(req, res) {
    try {
        const osEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.osETH.strategyContract,
            eigenLayerMainnetStrategyContracts.osETH.tokenContract,
            osEthAbi
        );
        res.send(osEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getSwEthTvl(req, res) {
    try {
        const swEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.swETH.strategyContract,
            eigenLayerMainnetStrategyContracts.swETH.tokenContract,
            swEthAbi
        );
        res.send(swEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getWbEthTvl(req, res) {
    try {
        const wbEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.wBETH.strategyContract,
            eigenLayerMainnetStrategyContracts.wBETH.tokenContract,
            wbEthAbi
        );
        res.send(wbEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getSfrxEthTvl(req, res) {
    try {
        const sfrxEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.sfrxETH.strategyContract,
            eigenLayerMainnetStrategyContracts.sfrxETH.tokenContract,
            sfrxEthAbi
        );
        res.send(sfrxEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getLsEthTvl(req, res) {
    try {
        const lsEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.lsETH.strategyContract,
            eigenLayerMainnetStrategyContracts.lsETH.tokenContract,
            lsEthAbi
        );
        res.send(lsEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export async function getMEthTvl(req, res) {
    try {
        const mEthTvl = await getStrategyBalance(
            eigenLayerMainnetStrategyContracts.mETH.strategyContract,
            eigenLayerMainnetStrategyContracts.mETH.tokenContract,
            mEthAbi
        );
        res.send(mEthTvl);
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch data:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}
