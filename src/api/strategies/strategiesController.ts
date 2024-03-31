import { Request, Response } from 'express'
import { formatEther } from 'viem'
import publicViemClient from '@/viem/viemClient'
import { eigenLayerMainnetStrategyContracts } from '@/data/address/eigenMainnetContracts'

// ABI Imports
import { cbEthAbi } from '@/data/abi/cbEthAbi'
import { stEthAbi } from '@/data/abi/stEthAbi'
import { rEthAbi } from '@/data/abi/rEthAbi'
import { ethXAbi } from '@/data/abi/ethXAbi'
import { ankrEthAbi } from '@/data/abi/ankrEthAbi'
import { oEthAbi } from '@/data/abi/oEthAbi'
import { osEthAbi } from '@/data/abi/osEthAbi'
import { swEthAbi } from '@/data/abi/swEthAbi'
import { wbEthAbi } from '@/data/abi/wbEthAbi'
import { sfrxEthAbi } from '@/data/abi/sfrxEthAbi'
import { lsEthAbi } from '@/data/abi/lsEthAbi'
import { mEthAbi } from '@/data/abi/mEthAbi'

async function getStrategyBalance(
	strategyProxyContractAddr: string,
	tokenProxyContractAddr: string,
	tokenImplementationAbi: any
) {
	const data = (await publicViemClient.readContract({
		address: tokenProxyContractAddr as `0x${string}`,
		abi: tokenImplementationAbi,
		functionName: 'balanceOf',
		args: [strategyProxyContractAddr]
	})) as bigint

	const formatedData = formatEther(data)

	return formatedData
}

export async function getCbEthTvl(req: Request, res: Response) {
	try {
		const cbEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.cbETH.strategyContract,
			eigenLayerMainnetStrategyContracts.cbETH.tokenContract,
			cbEthAbi
		)
		res.send(cbEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getStEthTvl(req: Request, res: Response) {
	try {
		const stEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.stETH.strategyContract,
			eigenLayerMainnetStrategyContracts.stETH.tokenContract,
			stEthAbi
		)
		res.send(stEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getREthTvl(req: Request, res: Response) {
	try {
		const rEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.rETH.strategyContract,
			eigenLayerMainnetStrategyContracts.rETH.tokenContract,
			rEthAbi
		)
		res.send(rEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getEthXTvl(req: Request, res: Response) {
	try {
		const ethXTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.ETHx.strategyContract,
			eigenLayerMainnetStrategyContracts.ETHx.tokenContract,
			ethXAbi
		)
		res.send(ethXTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getAnkrEthTvl(req: Request, res: Response) {
	try {
		const ankrEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.ankrETH.strategyContract,
			eigenLayerMainnetStrategyContracts.ankrETH.tokenContract,
			ankrEthAbi
		)
		res.send(ankrEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getOEthTvl(req: Request, res: Response) {
	try {
		const oEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.oETH.strategyContract,
			eigenLayerMainnetStrategyContracts.oETH.tokenContract,
			oEthAbi
		)
		res.send(oEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getOsEthTvl(req: Request, res: Response) {
	try {
		const osEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.osETH.strategyContract,
			eigenLayerMainnetStrategyContracts.osETH.tokenContract,
			osEthAbi
		)
		res.send(osEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getSwEthTvl(req: Request, res: Response) {
	try {
		const swEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.swETH.strategyContract,
			eigenLayerMainnetStrategyContracts.swETH.tokenContract,
			swEthAbi
		)
		res.send(swEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getWbEthTvl(req: Request, res: Response) {
	try {
		const wbEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.wBETH.strategyContract,
			eigenLayerMainnetStrategyContracts.wBETH.tokenContract,
			wbEthAbi
		)
		res.send(wbEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getSfrxEthTvl(req: Request, res: Response) {
	try {
		const sfrxEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.sfrxETH.strategyContract,
			eigenLayerMainnetStrategyContracts.sfrxETH.tokenContract,
			sfrxEthAbi
		)
		res.send(sfrxEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getLsEthTvl(req: Request, res: Response) {
	try {
		const lsEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.lsETH.strategyContract,
			eigenLayerMainnetStrategyContracts.lsETH.tokenContract,
			lsEthAbi
		)
		res.send(lsEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getMEthTvl(req: Request, res: Response) {
	try {
		const mEthTvl = await getStrategyBalance(
			eigenLayerMainnetStrategyContracts.mETH.strategyContract,
			eigenLayerMainnetStrategyContracts.mETH.tokenContract,
			mEthAbi
		)
		res.send(mEthTvl)
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}
