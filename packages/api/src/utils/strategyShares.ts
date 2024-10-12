import prisma from '@prisma/client'
import { getPrismaClient } from './prismaClient'
import { fetchTokenPrices } from './tokenPrices'
import { getViemClient } from '../viem/viemClient'
import { serviceManagerUIAbi } from '../data/abi/serviceManagerUIAbi'

export interface StrategyWithShareUnderlying {
	symbol: string
	strategyAddress: string
	tokenAddress: string
	sharesToUnderlying: number
	ethPrice: number
}

/**
 * Get the strategies with their shares underlying and their token prices
 *
 * @returns
 */
export async function getStrategiesWithShareUnderlying(): Promise<StrategyWithShareUnderlying[]> {
	const prismaClient = getPrismaClient()
	const strategies = await prismaClient.strategies.findMany()
	const tokenPrices = await fetchTokenPrices()

	return strategies.map((s) => {
		const foundTokenPrice = tokenPrices.find(
			(tp) => tp.address.toLowerCase() === s.underlyingToken.toLowerCase()
		)

		return {
			symbol: s.symbol,
			strategyAddress: s.address,
			tokenAddress: s.underlyingToken,
			sharesToUnderlying: BigInt(s.sharesToUnderlying) as unknown as number,
			ethPrice: foundTokenPrice?.ethPrice || 0
		}
	})
}

/**
 * Return the Tvl of a given set of shares across strategies
 *
 * @param shares
 * @param strategiesWithSharesUnderlying
 * @returns
 */
export function sharesToTVL(
	shares: {
		strategyAddress: string
		shares: string
	}[],
	strategiesWithSharesUnderlying: StrategyWithShareUnderlying[]
) {
	const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'

	const beaconStrategy = shares.find((s) => s.strategyAddress.toLowerCase() === beaconAddress)
	const restakingStrategies = shares.filter(
		(s) => s.strategyAddress.toLowerCase() !== beaconAddress
	)

	const tvlBeaconChain = beaconStrategy ? Number(beaconStrategy.shares) / 1e18 : 0

	let tvlRestaking = 0
	const tvlStrategies: Map<string, number> = new Map()
	const tvlStrategiesEth: Map<string, number> = new Map()

	restakingStrategies.map((s) => {
		const sharesUnderlying = strategiesWithSharesUnderlying.find(
			(su) => su.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
		)

		if (sharesUnderlying) {
			const strategyShares =
				Number((BigInt(s.shares) * BigInt(sharesUnderlying.sharesToUnderlying)) / BigInt(1e18)) /
				1e18

			tvlStrategies.set(sharesUnderlying.symbol, strategyShares)

			// Add the TVL in ETH, if 0, it will not be added to the total
			if (sharesUnderlying.ethPrice) {
				const strategyTvl = strategyShares * sharesUnderlying.ethPrice

				tvlStrategiesEth.set(sharesUnderlying.symbol, strategyTvl)

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

/**
 * Return the Tvl in Eth of a given set of shares across strategies
 *
 * @param shares
 * @param strategiesWithSharesUnderlying
 * @returns
 */
export function sharesToTVLStrategies(
	shares: {
		strategyAddress: string
		shares: string
	}[],
	strategiesWithSharesUnderlying: StrategyWithShareUnderlying[]
): { [strategyAddress: string]: number } {
	const tvlStrategiesEth: { [strategyAddress: string]: number } = {}

	for (const share of shares) {
		const strategyAddress = share.strategyAddress.toLowerCase()

		const sharesUnderlying = strategiesWithSharesUnderlying.find(
			(su) => su.strategyAddress.toLowerCase() === strategyAddress
		)

		if (sharesUnderlying) {
			const strategyShares =
				new prisma.Prisma.Decimal(share.shares)
					.mul(new prisma.Prisma.Decimal(sharesUnderlying.sharesToUnderlying.toString()))
					.div(new prisma.Prisma.Decimal(10).pow(18))
					.toNumber() / 1e18

			const strategyTokenPrice = sharesUnderlying.ethPrice || 0
			const strategyTvl = strategyShares * strategyTokenPrice
			tvlStrategiesEth[strategyAddress] = (tvlStrategiesEth[strategyAddress] || 0) + strategyTvl
		}
	}

	return tvlStrategiesEth
}

/**
 * Get the restakeable strategies for a given avs
 *
 * @param avsAddress
 * @returns
 */
export async function getRestakeableStrategies(avsAddress: string): Promise<string[]> {
	try {
		const viemClient = getViemClient()

		const strategies = (await viemClient.readContract({
			address: avsAddress as `0x${string}`,
			abi: serviceManagerUIAbi,
			functionName: 'getRestakeableStrategies'
		})) as string[]

		return strategies.map((s) => s.toLowerCase())
	} catch (error) {}

	return []
}
