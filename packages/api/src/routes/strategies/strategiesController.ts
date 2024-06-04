import type { Request, Response } from 'express'
import { formatEther } from 'viem'
import { eigenLayerMainnetStrategyContracts } from '../../data/address/eigenMainnetContracts'
import { getViemClient } from '../../viem/viemClient'
import {
	EigenStrategiesContractAddress,
	getEigenContracts
} from '../../data/address'
import { strategyAbi } from '../../data/abi/strategy'
import { TokenPrices } from '../../utils/tokenPrices'
import { cacheStore } from 'route-cache'
import { serviceManagerUIAbi } from '../../data/abi/serviceManagerUIAbi'

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
	meth: '../../data/abi/mEthAbi'
}

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
	const viemClient = getViemClient()
	const data = (await viemClient.readContract({
		address: tokenProxyContractAddr as `0x${string}`,
		abi: tokenImplementationAbi,
		functionName: 'balanceOf',
		args: [strategyProxyContractAddr]
	})) as bigint

	const formatedData = formatEther(data)

	return formatedData
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
		const strategyName = req.params.strategyName

		// Check if the strategy name is provided
		if (!strategyName) {
			return res.status(400).send('Strategy name is required.')
		}

		// Format strategy name to lowercase
		const strategyNameLowerCase = strategyName.toLowerCase()

		// Convert the keys in contracts object to lowercase
		const mainnetStrategyContractsLowerCase = {}
		for (const key in eigenLayerMainnetStrategyContracts) {
			mainnetStrategyContractsLowerCase[key.toLowerCase()] =
				eigenLayerMainnetStrategyContracts[key]
		}

		// Check if the strategy name is valid and get the strategy contract
		const strategyContract =
			mainnetStrategyContractsLowerCase[strategyNameLowerCase]
		if (!strategyContract) {
			return res.status(404).send('Strategy not found.')
		}

		// Import the strategy ABI then get the strategy balance

		import(abiPath[strategyNameLowerCase]).then(async (abiModule) => {
			// Hack to avoid getting abi by strategy name (can cause error due to capitalization)
			const abi = Object.values(abiModule)[0]
			const strategyTvl = await getStrategyBalance(
				strategyContract.strategyContract,
				strategyContract.tokenContract,
				abi
			)

			res.status(200).send(strategyTvl)
		})
	} catch (error) {
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
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
		const tvlPromises: Promise<string>[] = []

		// Iterate over each strategy to prepare TVL fetch promises
		for (const strategyName in eigenLayerMainnetStrategyContracts) {
			const strategyContract = eigenLayerMainnetStrategyContracts[strategyName]

			// Import the strategy ABI dynamically based on the strategyName
			const strategyAbiPath = abiPath[strategyName.toLowerCase()]
			const abiModulePromise = import(strategyAbiPath)

			// Create a promise to fetch the strategy's TVL
			const tvlPromise = abiModulePromise.then(async (abiModule) => {
				// Extract the ABI, assuming the ABI is the first export of the module
				const abi = Object.values(abiModule)[0]
				return getStrategyBalance(
					strategyContract.strategyContract,
					strategyContract.tokenContract,
					abi
				)
			})

			// Add the promise to the array
			tvlPromises.push(tvlPromise)
		}

		// Use Promise.all to fetch all TVLs concurrently
		const tvls = await Promise.all(tvlPromises)

		// Sum up all the TVLs to get the total TVL
		const totalTvl = tvls.reduce((acc, tvl) => acc + Number.parseFloat(tvl), 0)

		res.send(totalTvl.toString())
	} catch (error) {
		console.error('Failed to fetch data:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getStrategiesWithShareUnderlying(): Promise<
	{
		strategyAddress: string
		sharesToUnderlying: number
	}[]
> {
	const viemClient = getViemClient()
	const strategies = Object.values(getEigenContracts().Strategies)
	const sharesUnderlying = await Promise.all(
		strategies.map(async (s) => {
			const cachedValue = await cacheStore.get(
				`sharesUnderlying_${s.strategyContract}`
			)

			if (cachedValue) {
				return cachedValue
			}

			let sharesToUnderlying = 1e18

			try {
				sharesToUnderlying = (await viemClient.readContract({
					address: s.strategyContract,
					abi: strategyAbi,
					functionName: 'sharesToUnderlying',
					args: [1e18]
				})) as number
			} catch {}

			const strategySharesUnderlying = {
				strategyAddress: s.strategyContract,
				sharesToUnderlying
			}

			await cacheStore.set(
				`sharesUnderlying_${s.strategyContract}`,
				strategySharesUnderlying,
				120_000
			)

			return strategySharesUnderlying
		})
	)

	return sharesUnderlying
}

export function sharesToTVL(
	shares: {
		strategyAddress: string
		shares: string
	}[],
	strategiesWithSharesUnderlying: {
		strategyAddress: string
		sharesToUnderlying: number
	}[],
	strategyTokenPrices: TokenPrices
) {
	const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'

	const beaconStrategy = shares.find(
		(s) => s.strategyAddress.toLowerCase() === beaconAddress
	)
	const restakingStrategies = shares.filter(
		(s) => s.strategyAddress.toLowerCase() !== beaconAddress
	)

	const tvlBeaconChain = beaconStrategy
		? Number(beaconStrategy.shares) / 1e18
		: 0

	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategies = Object.values(getEigenContracts().Strategies)

	let tvlRestaking = 0
	const tvlStrategies: Map<keyof EigenStrategiesContractAddress, number> =
		new Map(
			strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
		)
	const tvlStrategiesEth: Map<keyof EigenStrategiesContractAddress, number> =
		new Map(
			strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
		)

	restakingStrategies.map((s) => {
		const foundStrategyIndex = strategies.findIndex(
			(si) =>
				si.strategyContract.toLowerCase() === s.strategyAddress.toLowerCase()
		)

		const strategyTokenPrice = Object.values(strategyTokenPrices).find(
			(stp) =>
				stp.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
		)
		const sharesUnderlying = strategiesWithSharesUnderlying.find(
			(su) =>
				su.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
		)

		if (foundStrategyIndex !== -1 && sharesUnderlying) {
			const strategyShares =
				Number(
					(BigInt(s.shares) * BigInt(sharesUnderlying.sharesToUnderlying)) /
						BigInt(1e18)
				) / 1e18

			tvlStrategies.set(
				strategyKeys[
					foundStrategyIndex
				] as keyof EigenStrategiesContractAddress,
				strategyShares
			)

			if (strategyTokenPrice) {
				const strategyTvl = strategyShares * strategyTokenPrice.eth

				tvlStrategiesEth.set(
					strategyKeys[
						foundStrategyIndex
					] as keyof EigenStrategiesContractAddress,
					strategyTvl
				)

				tvlRestaking = tvlRestaking + strategyTvl
			}
		}
	})

	return {
		tvl: tvlBeaconChain + tvlRestaking,
		tvlBeaconChain,
		tvlWETH: tvlStrategies.has('WETH') ? tvlStrategies.get('WETH') : 0,
		tvlRestaking,
		tvlStrategies: Object.fromEntries(tvlStrategies.entries()),
		tvlStrategiesEth: Object.fromEntries(tvlStrategiesEth.entries())
	}
}

export async function getRestakeableStrategies(
	avsAddress: string
): Promise<string[]> {
	try {
		const viemClient = getViemClient()

		const strategies = (await viemClient.readContract({
			address: avsAddress as `0x${string}`,
			abi: serviceManagerUIAbi,
			functionName: 'getRestakeableStrategies'
		})) as string[]

		return strategies.map(s => s.toLowerCase())
	} catch (error) {}

	return []
}
