import type { Request, Response } from 'express'
import type Prisma from '@prisma/client'
import prisma from '../../utils/prismaClient'
import {
	type EigenStrategiesContractAddress,
	getEigenContracts
} from '../../data/address'
import {
	EigenExplorerApiError,
	handleAndReturnErrorResponse
} from '../../schema/errors'
import { getAvsFilterQuery } from '../avs/avsController'
import { HistoricalCountSchema } from '../../schema/zod/schemas/historicalCountQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import { getContract } from 'viem'
import { strategyAbi } from '../../data/abi/strategy'
import { getViemClient } from '../../viem/viemClient'
import { getStrategiesWithShareUnderlying } from '../strategies/strategiesController'
import { CirculatingSupplyWithChange, fetchEthCirculatingSupply } from '../../utils/ethCirculatingSupply'
import { WithChangeQuerySchema } from '../../schema/zod/schemas/withChangeQuery'

const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'

/* 
===================
====== Types ======
=================== 
*/

// --- TVL Routes ---

type TvlWithoutChange = number
type TvlWithChange = {
	tvl: TvlWithoutChange
	change24h: { value: number; percent: number }
	change7d: { value: number; percent: number }
}

// --- Total Routes ---

type TotalWithoutChange = number
type TotalWithChange = {
	total: TotalWithoutChange
	change24h: { value: number; percent: number }
	change7d: { value: number; percent: number }
}
type TotalWithdrawalsWithoutChange = {
	total: number
	pending: number
	completed: number
}
type TotalWithdrawalsWithChange = {
	total: {
		value: number
		change24h: { value: number; percent: number }
		change7d: { value: number; percent: number }
	}
	pending: {
		value: number
		change24h: { value: number; percent: number }
		change7d: { value: number; percent: number }
	}
	completed: {
		value: number
		change24h: { value: number; percent: number }
		change7d: { value: number; percent: number }
	}
}



// --- Historical TVL Routes ---

type HistoricalTvlRecord = {
	timestamp: string
	tvlEth: number
}

type EthTvlModelMap = {
	metricDepositHourly: Prisma.MetricDepositHourly
	metricWithdrawalHourly: Prisma.MetricWithdrawalHourly
	metricEigenPodsHourly: Prisma.MetricEigenPodsHourly
}
type EthTvlModelName = keyof EthTvlModelMap // Models with TVL denominated in ETH

type NativeTvlModelMap = {
	metricStrategyHourly: Prisma.MetricStrategyHourly
	metricAvsStrategyHourly: Prisma.MetricAvsStrategyHourly
	metricOperatorStrategyHourly: Prisma.MetricOperatorStrategyHourly
}
type NativeTvlModelName = keyof NativeTvlModelMap // Models with TVL denominated in their own native token

type MetricModelMap = EthTvlModelMap & NativeTvlModelMap
type MetricModelName = keyof (EthTvlModelMap & NativeTvlModelMap)

// --- Historical Metrics Routes ---

type HistoricalValueRecord = {
	timestamp: string
	valueEth: number
}

type HistoricalAggregateRecord = {
	timestamp: string
	tvlEth: number
	totalStakers: number
	totalOperators?: number
	totalAvs?: number
}
type AggregateModelMap = {
	metricAvsHourly: Prisma.MetricAvsHourly
	metricOperatorHourly: Prisma.MetricOperatorHourly
}
type AggregateModelName = keyof AggregateModelMap

type RatioWithoutChange = number
type RatioWithChange = {
	ratio: RatioWithoutChange
	change24h: { value: number; percent: number }
	change7d: { value: number; percent: number }
}

/* 
========================
====== All Routes ======
======================== 
*/

// --- Holistic Routes ---

/**
 * Function for route /
 * Returns all TVL metrics & count metrics for AVS, Operator & Stakers (without 24h/7d change)
 *
 * @param req
 * @param res
 */
export async function getMetrics(req: Request, res: Response) {
	try {
		const [
			tvlRestaking,
			tvlBeaconChain,
			totalAvs,
			totalOperators,
			totalStakers
		] = await Promise.all([
			doGetTvl(false),
			doGetTvlBeaconChain(false),
			doGetTotalAvsCount(false),
			doGetTotalOperatorCount(false),
			doGetTotalStakerCount(false)
		])

		const metrics = {
			tvlRestaking,
			tvlBeaconChain,
			totalAvs,
			totalOperators,
			totalStakers
		}

		res.send({
			tvl:
				(tvlRestaking.tvlRestaking as TvlWithoutChange) +
				(tvlBeaconChain as TvlWithoutChange),
			tvlBeaconChain: tvlBeaconChain as TvlWithoutChange,
			...tvlRestaking,
			totalAvs: metrics.totalAvs as TotalWithoutChange,
			totalOperators: metrics.totalOperators as TotalWithoutChange,
			totalStakers: metrics.totalStakers as TotalWithoutChange
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- TVL Routes ---

/**
 * Function for route /tvl
 * Returns total EL TVL with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTvl(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const tvlRestaking = (await doGetTvl(withChange)).tvlRestaking
		const tvlBeaconChain = await doGetTvlBeaconChain(withChange)

		res.send({
			...(withChange
				? {
						...(await combineTvlWithChange(
							tvlRestaking as TvlWithChange,
							tvlBeaconChain as TvlWithChange
						))
				  }
				: {
						tvl:
							(tvlRestaking as TvlWithoutChange) +
							(tvlBeaconChain as TvlWithoutChange)
				  })
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /tvl/beacon-chain
 * Returns Beacon Chain TVL with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTvlBeaconChain(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const tvlBeaconChain = await doGetTvlBeaconChain(withChange)

		res.send({
			...(withChange
				? { ...(tvlBeaconChain as TvlWithChange) }
				: { tvl: tvlBeaconChain as TvlWithoutChange })
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /tvl/restaking
 * Returns Liquid Staking TVL with the option of 24h/7d change
 * Note: This TVL value includes Beacon ETH that's restaked (which is different from TVL Beacon Chain)
 *
 * @param req
 * @param res
 */
export async function getTvlRestaking(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const tvlResponse = await doGetTvl(withChange)

		res.send({
			...(withChange
				? { ...(tvlResponse.tvlRestaking as TvlWithChange) }
				: { tvl: tvlResponse.tvlRestaking as TvlWithoutChange }),
			tvlStrategies: tvlResponse.tvlStrategies,
			tvlStrategiesEth: tvlResponse.tvlStrategiesEth
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /tvl/restaking/:strategy
 * Returns strategy TVL for any given strategy address with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTvlRestakingByStrategy(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { strategy } = req.params
		const { withChange } = queryCheck.data

		const strategies = Object.keys(getEigenContracts().Strategies)
		const foundStrategy = strategies.find(
			(s) => s.toLowerCase() === strategy.toLowerCase()
		)

		if (!foundStrategy) {
			throw new EigenExplorerApiError({
				code: 'unprocessable_entity',
				message: 'invalid_string: Invalid Strategy'
			})
		}

		const tvlResponse = await doGetTvlStrategy(
			getEigenContracts().Strategies[foundStrategy].strategyContract,
			withChange
		)

		res.send({
			...(withChange
				? { ...(tvlResponse.tvl as TvlWithChange) }
				: { tvl: tvlResponse.tvl as TvlWithoutChange }),
			tvlEth: tvlResponse.tvlEth
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Total Routes ---

/**
 * Function for route /total-avs
 * Returns number of whitelisted AVSs with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalAvs(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const total = await doGetTotalAvsCount(withChange)

		res.send({
			...(withChange
				? { ...(total as TotalWithChange) }
				: { total: total as TotalWithoutChange })
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-operators
 * Returns number of Operators with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalOperators(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const total = await doGetTotalOperatorCount(withChange)

		res.send({
			...(withChange
				? { ...(total as TotalWithChange) }
				: { total: total as TotalWithoutChange })
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-stakers
 * Returns number of Stakers with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalStakers(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const total = await doGetTotalStakerCount(withChange)

		res.send({
			...(withChange
				? { ...(total as TotalWithChange) }
				: { total: total as TotalWithoutChange })
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-withdrawals
 * Returns number total, pending and completed Withdrawals with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalWithdrawals(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const total = await doGetTotalWithdrawals(withChange)

		res.send({
			...(withChange
				? { ...(total as TotalWithdrawalsWithChange) }
				: { ...(total as TotalWithdrawalsWithoutChange) })
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /total-deposits
 * Returns number total Deposits with the option of 24h/7d change
 *
 * @param req
 * @param res
 */
export async function getTotalDeposits(req: Request, res: Response) {
	const queryCheck = WithChangeQuerySchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { withChange } = queryCheck.data
		const total = await doGetTotalDeposits(withChange)

		res.send({
			...(withChange
				? { ...(total as TotalWithChange) }
				: { total: total as TotalWithoutChange })
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Historical TVL Routes ---

/**
 * Function for route /historical/tvl
 * Returns total EL TVL in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvl(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlTotal(
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/tvl/beacon-chain
 * Returns total Beacon Chain TVL in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlBeaconChain(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlBeacon(
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/restaking/:address
 * Returns Liquid Staking TVL for a given strategy in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlRestaking(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlRestaking(
			startAt,
			endAt,
			frequency,
			variant,
			address
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/withdrawals
 * Returns completed withdrawals TVL (net outflow from EL) in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlWithdrawal(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlWithdrawal(
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/deposits
 * Returns deposits TVL in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalTvlDeposit(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalTvlDeposit(
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Historical Aggregate Routes ---

/**
 * Function for route /historical/avs/:address
 * Returns TVL in ETH, totalOperators and totalStakers for a given whitelisted AVS in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalAvsAggregate(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalAvsAggregate(
			address,
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/operators/:address
 * Returns TVL in ETH, totalAvs and totalStakers for a given Operator in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalOperatorsAggregate(
	req: Request,
	res: Response
) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { address } = req.params
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalOperatorsAggregate(
			address,
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// --- Historical Count Routes ---

/**
 * Function for route /historical/count-avs
 * Returns total number of whitelisted AVSs in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalAvsCount(req: Request, res: Response) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'avs',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/count-operators
 * Returns total number of Operators in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalOperatorCount(req: Request, res: Response) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'operator',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/count-stakers
 * Returns total number of Stakers in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalStakerCount(req: Request, res: Response) {
	const paramCheck = HistoricalCountSchema.safeParse(req.query)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = paramCheck.data
		const data = await doGetHistoricalCount(
			'staker',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/count-withdrawals
 * Returns total number of queued withdrawals in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalWithdrawalCount(
	req: Request,
	res: Response
) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalCount(
			'withdrawalQueued',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /historical/count-deposits
 * Returns total number of deposits in historical format
 *
 * @param req
 * @param res
 */
export async function getHistoricalDepositCount(req: Request, res: Response) {
	const queryCheck = HistoricalCountSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { frequency, variant, startAt, endAt } = queryCheck.data
		const data = await doGetHistoricalCount(
			'deposit',
			startAt,
			endAt,
			frequency,
			variant
		)
		res.status(200).send({ data })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /deployment-ratio
 * Returns the Deployment Ratio
 *
 * @param req
 * @param res
 */
export async function getDeploymentRatio(req: Request, res: Response) {
    const queryCheck = WithChangeQuerySchema.safeParse(req.query)
    if (!queryCheck.success) {
        return handleAndReturnErrorResponse(req, res, queryCheck.error)
    }

    try {
        const { withChange } = queryCheck.data
        const ratio = await doGetDeploymentRatio(withChange)

        res.send({
            ...(withChange
                ? { ...(ratio as RatioWithChange) }
                : { ratio: ratio as RatioWithoutChange })
        })
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error)
    }
}

/**
 * Function for route /restaking-ratio
 * Returns the Restaking Ratio
 *
 * @param req
 * @param res
 */
export async function getRestakingRatio(req: Request, res: Response) {

    const queryCheck = WithChangeQuerySchema.safeParse(req.query)
    if (!queryCheck.success) {
        return handleAndReturnErrorResponse(req, res, queryCheck.error)
    }

    try {
        const { withChange } = queryCheck.data
        const ratio = await doGetRestakingRatio(withChange)

        res.send({
            ...(withChange
                ? { ...(ratio as RatioWithChange) }
                : { ratio: ratio as RatioWithoutChange })
        })
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error)
    }
}

/*
============================
=== Processing Functions ===
============================
*/

// --- TVL Routes ---

/**
 * Processes total TVL and optionally 24h/7d change for restaked ETH
 *
 * @param withChange
 * @returns
 */
async function doGetTvl(withChange: boolean) {
	let tvlRestaking: TvlWithoutChange = 0
	const ethPrices = withChange ? await fetchCurrentEthPrices() : undefined

	const strategyKeys = Object.keys(getEigenContracts().Strategies)
	const strategiesContracts = strategyKeys.map((s) =>
		getContract({
			address: getEigenContracts().Strategies[s].strategyContract,
			abi: strategyAbi,
			client: getViemClient()
		})
	)

	const tvlStrategies = {}
	const tvlStrategiesEth: Map<keyof EigenStrategiesContractAddress, number> =
		new Map(
			strategyKeys.map((sk) => [sk as keyof EigenStrategiesContractAddress, 0])
		)

	try {
		const totalShares = await Promise.all(
			strategiesContracts.map(async (sc, i) => ({
				strategyKey: strategyKeys[i],
				strategyAddress: sc.address.toLowerCase(),
				shares: (await sc.read.totalShares()) as string
			}))
		)

		const strategiesWithSharesUnderlying =
			await getStrategiesWithShareUnderlying()
		const strategyTokenPrices = await fetchStrategyTokenPrices()

		totalShares.map((s) => {
			const strategyTokenPrice = Object.values(strategyTokenPrices).find(
				(stp) =>
					stp.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
			)
			const sharesUnderlying = strategiesWithSharesUnderlying.find(
				(su) =>
					su.strategyAddress.toLowerCase() === s.strategyAddress.toLowerCase()
			)

			if (sharesUnderlying) {
				const strategyShares =
					Number(
						(BigInt(s.shares) * BigInt(sharesUnderlying.sharesToUnderlying)) /
							BigInt(1e18)
					) / 1e18

				tvlStrategies[s.strategyKey] = strategyShares

				if (strategyTokenPrice) {
					const strategyTvl = strategyShares * strategyTokenPrice.eth

					tvlStrategiesEth.set(
						s.strategyKey as keyof EigenStrategiesContractAddress,
						strategyTvl
					)

					tvlRestaking += strategyTvl
				}
			}
		})
	} catch (error) {}

	return {
		tvlRestaking: withChange
			? await calculateTvlChange(
					tvlRestaking,
					'metricStrategyHourly',
					ethPrices
			  )
			: tvlRestaking,
		tvlStrategies,
		tvlStrategiesEth: Object.fromEntries(tvlStrategiesEth.entries())
	}
}

/**
 * Processes total TVL and optionally 24h/7d change for a given strategy
 *
 * @param strategy
 * @param withChange
 * @returns
 */
async function doGetTvlStrategy(strategy: `0x${string}`, withChange: boolean) {
	let tvl = 0
	let tvlEth = 0

	const ethPrices = withChange ? await fetchCurrentEthPrices() : undefined

	try {
		const strategyTokenPrices = await fetchStrategyTokenPrices()
		const strategyTokenPrice = Object.values(strategyTokenPrices).find(
			(stp) => stp.strategyAddress.toLowerCase() === strategy.toLowerCase()
		)

		const contract = getContract({
			address: strategy,
			abi: strategyAbi,
			client: getViemClient()
		})

		tvl =
			Number(
				await contract.read.sharesToUnderlyingView([
					await contract.read.totalShares()
				])
			) / 1e18

		if (strategyTokenPrice) {
			tvlEth = tvl * strategyTokenPrice.eth
		}
	} catch (error) {}

	return {
		tvl: withChange
			? await calculateTvlChange(
					tvl,
					'metricStrategyHourly',
					ethPrices,
					strategy
			  )
			: (tvl as TvlWithoutChange),
		tvlEth
	}
}

/**
 * Processes total TVL and optionally 24h/7d change for Beacon Chain ETH
 * Used by getMetrics() & getBeaconChainTvl()
 *
 * @returns
 */
async function doGetTvlBeaconChain(
	withChange: boolean
): Promise<TvlWithoutChange | TvlWithChange> {
	const totalValidators = await prisma.validator.aggregate({
		_sum: {
			balance: true
		}
	})

	const currentTvl = Number(totalValidators._sum.balance) / 1e9

	return withChange
		? ((await calculateTvlChange(currentTvl, 'metricEigenPodsHourly')) as TvlWithChange)
		: (currentTvl as TvlWithoutChange)
}

// --- Total Routes ---

/**
 * Processes total AVS count and optionally 24h/7d change
 *
 * @param withChange
 * @returns
 */
async function doGetTotalAvsCount(
	withChange: boolean
): Promise<TotalWithoutChange | TotalWithChange> {
	const totalNow = await prisma.avs.count({
		where: getAvsFilterQuery(true)
	})

	if (!withChange) {
		return totalNow as TotalWithoutChange
	}

	const getChange24hValue = prisma.avs.count({
		where: {
			createdAt: { gte: getTimestamp('24h') },
			...getAvsFilterQuery(true)
		}
	})
	const getChange7dValue = prisma.avs.count({
		where: {
			createdAt: { gte: getTimestamp('7d') },
			...getAvsFilterQuery(true)
		}
	})

	const [change24hValue, change7dValue] = await Promise.all([
		getChange24hValue,
		getChange7dValue
	])

	return calculateTotalChange(totalNow, change24hValue, change7dValue)
}

/**
 * Processes total Operator count and optionally 24h/7d change
 *
 * @param withChange
 * @returns
 */
async function doGetTotalOperatorCount(withChange: boolean) {
	const totalNow = await prisma.operator.count()

	if (!withChange) {
		return totalNow as TotalWithoutChange
	}

	const getChange24hValue = prisma.operator.count({
		where: {
			createdAt: { gte: getTimestamp('24h') }
		}
	})
	const getChange7dValue = prisma.operator.count({
		where: {
			createdAt: { gte: getTimestamp('7d') }
		}
	})

	const [change24hValue, change7dValue] = await Promise.all([
		getChange24hValue,
		getChange7dValue
	])

	return calculateTotalChange(totalNow, change24hValue, change7dValue)
}

/**
 * Processes total Staker count and optionally 24h/7d change
 *
 * @param withChange
 * @returns
 */
async function doGetTotalStakerCount(withChange: boolean) {
	const totalNow = await prisma.staker.count({
		where: { operatorAddress: { not: null } }
	})

	if (!withChange) {
		return totalNow as TotalWithoutChange
	}

	const getChange24hValue = prisma.staker.count({
		where: {
			createdAt: { gte: getTimestamp('24h') },
			operatorAddress: { not: null }
		}
	})
	const getChange7dValue = prisma.staker.count({
		where: {
			createdAt: { gte: getTimestamp('7d') },
			operatorAddress: { not: null }
		}
	})

	const [change24hValue, change7dValue] = await Promise.all([
		getChange24hValue,
		getChange7dValue
	])

	return calculateTotalChange(totalNow, change24hValue, change7dValue)
}

/**
 * Processes total Withdrawals count and optionally 24h/7d change
 *
 * @param withChange
 * @returns
 */
async function doGetTotalWithdrawals(
	withChange: boolean
): Promise<TotalWithdrawalsWithoutChange | TotalWithdrawalsWithChange> {
	const totalNow = await prisma.withdrawalQueued.count()
	const completedNow = await prisma.withdrawalCompleted.count()
	const pendingNow = totalNow - completedNow

	if (!withChange) {
		return {
			total: totalNow,
			pending: pendingNow,
			completed: completedNow
		}
	}

	const getTotal24hAgo = prisma.withdrawalQueued.count({
		where: {
			createdAt: { gte: getTimestamp('24h') }
		}
	})
	const getCompleted24hAgo = prisma.withdrawalCompleted.count({
		where: {
			createdAt: { gte: getTimestamp('24h') }
		}
	})
	const getTotal7dAgo = prisma.withdrawalQueued.count({
		where: {
			createdAt: { gte: getTimestamp('7d') }
		}
	})
	const getCompleted7dAgo = prisma.withdrawalCompleted.count({
		where: {
			createdAt: { gte: getTimestamp('7d') }
		}
	})

	const [total24hAgo, completed24hAgo, total7dAgo, completed7dAgo] =
		await Promise.all([
			getTotal24hAgo,
			getCompleted24hAgo,
			getTotal7dAgo,
			getCompleted7dAgo
		])

	const pending24hAgo = total24hAgo - completed24hAgo
	const pending7dAgo = total7dAgo - completed7dAgo

	const totalChange = await calculateTotalChange(
		totalNow,
		totalNow - total24hAgo,
		totalNow - total7dAgo
	)

	const pendingChange = await calculateTotalChange(
		pendingNow,
		pendingNow - pending24hAgo,
		pendingNow - pending7dAgo
	)

	const completedChange = await calculateTotalChange(
		completedNow,
		completedNow - completed24hAgo,
		completedNow - completed7dAgo
	)

	return {
		total: {
			value: totalChange.total,
			change24h: totalChange.change24h,
			change7d: totalChange.change7d
		},
		pending: {
			value: pendingChange.total,
			change24h: pendingChange.change24h,
			change7d: pendingChange.change7d
		},
		completed: {
			value: completedChange.total,
			change24h: completedChange.change24h,
			change7d: completedChange.change7d
		}
	}
}

/**
 * Processes total Deposits count and optionally 24h/7d change
 *
 * @param withChange
 * @returns
 */
async function doGetTotalDeposits(withChange: boolean) {
	const totalNow = await prisma.deposit.count()

	if (!withChange) {
		return totalNow as TotalWithoutChange
	}

	const getChange24hValue = prisma.deposit.count({
		where: {
			createdAt: { gte: getTimestamp('24h') }
		}
	})
	const getChange7dValue = prisma.deposit.count({
		where: {
			createdAt: { gte: getTimestamp('7d') }
		}
	})

	const [change24hValue, change7dValue] = await Promise.all([
		getChange24hValue,
		getChange7dValue
	])

	return calculateTotalChange(totalNow, change24hValue, change7dValue)
}

// --- Historical TVL Routes ---

/**
 * Processes total TVL in historical format
 * Calculates total TVL by combining historical total Beacon Chain ETH TVL with restaking TVL (without restaked Beacon Chain ETH)
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 */
async function doGetHistoricalTvlTotal(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	// Get historical tvl data for Beacon Chain ETH and LSTs (excluding restaked Beacon Chain ETH)
	const [beaconTvl, restakingTvl] = await Promise.all([
		doGetHistoricalTvlBeacon(startAt, endAt, frequency, variant),
		doGetHistoricalTvlRestaking(
			startAt,
			endAt,
			frequency,
			variant,
			undefined,
			false
		)
	])

	// Combine the results
	const results = beaconTvl.map((beaconEntry, index) => {
		const restakingEntry = restakingTvl[index]
		if (!restakingEntry || beaconEntry.timestamp !== restakingEntry.timestamp) {
			throw new Error(`Mismatch in historical data at index ${index}`)
		}

		return {
			timestamp: beaconEntry.timestamp,
			tvlEth: beaconEntry.tvlEth + restakingEntry.tvlEth
		}
	})

	return results as HistoricalTvlRecord[]
}

/**
 * Processes total Beacon Chain ETH TVL in historical format
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 */
async function doGetHistoricalTvlBeacon(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))

	// Fetch the timestamp of the first record on or before startTimestamp
	const initialDataTimestamp = await prisma.metricEigenPodsHourly.findFirst({
		where: {
			timestamp: {
				lte: startTimestamp
			}
		},
		orderBy: {
			timestamp: 'desc'
		}
	})

	// Fetch all records from the initialDataTimestamp
	const hourlyData = await prisma.metricEigenPodsHourly.findMany({
		where: {
			timestamp: {
				gte: initialDataTimestamp?.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
				lte: endTimestamp
			}
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	const results: HistoricalTvlRecord[] = []
	const modelName = 'metricEigenPodsHourly' as MetricModelName

	let tvlEth = variant === 'cumulative' ? Number(hourlyData[0].tvlEth) : 0

	const offset = getOffsetInMs(frequency)
	let currentTimestamp = startTimestamp

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)
		const intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		tvlEth = calculateTvlForHistoricalRecord(
			intervalData,
			variant,
			tvlEth,
			modelName
		)

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

/**
 * Processes restaking TVL in historical format with option
 * Calculates total TVL using restaked Beacon Chain ETH, not total Beacon Chain ETH
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 */
async function doGetHistoricalTvlRestaking(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string,
	address?: string,
	includeBeaconInTvl = true
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))
	const modelName = 'metricStrategyHourly' as MetricModelName

	const ethPrices = await fetchCurrentEthPrices()

	// Fetch the timestamp of the first record on or before startTimestamp
	const initialDataTimestamps = await prisma.metricStrategyHourly.groupBy({
		by: ['strategyAddress'],
		_max: {
			timestamp: true
		},
		where: {
			timestamp: {
				lte: startTimestamp
			},
			...(address && { strategyAddress: address.toLowerCase() }),
			...(!includeBeaconInTvl && { strategyAddress: { not: beaconAddress } })
		}
	})

	// For every strategyAddress, fetch all records from the initialDataTimestamp
	let hourlyData = await prisma.metricStrategyHourly.findMany({
		where: {
			OR: initialDataTimestamps.map((metric) => ({
				AND: [
					{
						strategyAddress: metric.strategyAddress
					},
					{
						timestamp: {
							gte: metric._max.timestamp, // Guarantees correct initial data for cumulative queries
							lte: endTimestamp
						}
					}
				]
			})) as Prisma.Prisma.MetricStrategyHourlyWhereInput[]
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	let tvlEth =
		variant === 'cumulative'
			? await getInitialTvlCumulativeFromNative(hourlyData, ethPrices)
			: 0

	let strategyAddresses = [
		...new Set(hourlyData.map((data) => data.strategyAddress))
	]

	// Gather the remaining strategies that might not currently be in the strategyData
	const remaininghourlyData = await prisma.metricStrategyHourly.findMany({
		where: {
			AND: [
				{
					strategyAddress: {
						notIn: strategyAddresses
					},
					...(address && { strategyAddress: address.toLowerCase() }),
					...(!includeBeaconInTvl && {
						strategyAddress: { not: beaconAddress }
					})
				},
				{
					timestamp: {
						gt: startTimestamp,
						lte: endTimestamp
					}
				}
			]
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	hourlyData = [...hourlyData, ...remaininghourlyData]
	strategyAddresses = [
		...new Set(hourlyData.map((data) => data.strategyAddress))
	]

	const results: HistoricalTvlRecord[] = []

	const offset = getOffsetInMs(frequency)
	let currentTimestamp = startTimestamp

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)
		let intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		const presentAddresses = new Set(
			intervalData.map((data) => data.strategyAddress)
		)

		// For each unique strategy address not present in this interval, add its latest record
		const missingRecords = strategyAddresses.flatMap((address) => {
			if (!presentAddresses.has(address)) {
				const latestRecord = hourlyData
					.filter(
						(data) =>
							data.strategyAddress === address && data.timestamp < nextTimestamp
					)
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

				return latestRecord ? [latestRecord] : []
			}
			return []
		})

		intervalData = [...intervalData, ...missingRecords]

		tvlEth = calculateTvlForHistoricalRecord(
			intervalData,
			variant,
			tvlEth,
			modelName,
			ethPrices
		)

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

/**
 * Processes withdrawals TVL in historical format
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalTvlWithdrawal(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))

	// Fetch the timestamp of the first record on or before startTimestamp
	const initialDataTimestamp = await prisma.metricWithdrawalHourly.findFirst({
		where: {
			timestamp: {
				lte: startTimestamp
			}
		},
		orderBy: {
			timestamp: 'desc'
		}
	})

	// Fetch all records from the initialDataTimestamp
	const hourlyData = await prisma.metricWithdrawalHourly.findMany({
		where: {
			timestamp: {
				gte: initialDataTimestamp?.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
				lte: endTimestamp
			}
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	const results: HistoricalValueRecord[] = []

	// MetricHourly records are created only when activity is detected, not necessarily for all timestamps. If cumulative, we may need to set initial tvl value
	let tvlEth = variant === 'cumulative' ? Number(hourlyData[0].tvlEth) : 0

	const offset = getOffsetInMs(frequency)
	let currentTimestamp = startTimestamp

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)
		const intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		tvlEth = calculateTvlForHistoricalRecord(
			intervalData,
			variant,
			tvlEth,
			'metricWithdrawalHourly' as MetricModelName
		)

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			valueEth: tvlEth
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

/**
 * Processes deposits TVL in historical format
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalTvlDeposit(
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))

	// Fetch the timestamp of the first record on or before startTimestamp
	const initialDataTimestamp = await prisma.metricDepositHourly.findFirst({
		where: {
			timestamp: {
				lte: startTimestamp
			}
		},
		orderBy: {
			timestamp: 'desc'
		}
	})

	// Fetch all records from the initialDataTimestamp
	const hourlyData = await prisma.metricDepositHourly.findMany({
		where: {
			timestamp: {
				gte: initialDataTimestamp?.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
				lte: endTimestamp
			}
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	const results: HistoricalValueRecord[] = []

	// MetricHourly records are created only when activity is detected, not necessarily for all timestamps. If cumulative, we may need to set initial tvl value
	let tvlEth = variant === 'cumulative' ? Number(hourlyData[0].tvlEth) : 0

	const offset = getOffsetInMs(frequency)
	let currentTimestamp = startTimestamp

	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)
		const intervalData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		tvlEth = calculateTvlForHistoricalRecord(
			intervalData,
			variant,
			tvlEth,
			'metricDepositHourly' as MetricModelName
		)

		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			valueEth: tvlEth
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

// --- Historical Aggregate Routes ---

/**
 * Processes TVL in ETH, totalStakers & totalOperators in historical format
 *
 * @param address
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalAvsAggregate(
	address: string,
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))
	const modelNameTvl = 'metricAvsStrategyHourly' as MetricModelName

	const ethPrices = await fetchCurrentEthPrices()

	// Fetch initial data for metrics calculation
	const processMetricHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamp = await prisma.metricAvsHourly.groupBy({
			by: ['avsAddress'],
			_max: {
				timestamp: true
			},
			where: {
				timestamp: {
					lte: startTimestamp
				},
				avsAddress: address.toLowerCase()
			}
		})

		// Fetch all records from the initialDataTimestamp
		const hourlyData = await prisma.metricAvsHourly.findMany({
			where: {
				avsAddress: address.toLowerCase(),
				timestamp: {
					gte: initialDataTimestamp[0]?._max.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
					lte: endTimestamp
				}
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		let totalStakers = 0
		let totalOperators = 0

		if (variant === 'cumulative' && initialDataTimestamp[0]?._max.timestamp) {
			totalStakers = hourlyData[0].totalStakers
			totalOperators = hourlyData[0].totalOperators
		}

		return { hourlyData, totalStakers, totalOperators }
	}

	// Fetch initial data for tvlEth calculation
	const processMetricStrategyHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamps = await prisma.metricAvsStrategyHourly.groupBy({
			by: ['avsAddress', 'strategyAddress'],
			_max: {
				timestamp: true
			},
			where: {
				timestamp: {
					lte: startTimestamp
				},
				avsAddress: address.toLowerCase()
			}
		})

		// For every strategyAddress, fetch all records from the initialDataTimestamp
		const strategyData = await prisma.metricAvsStrategyHourly.findMany({
			where: {
				OR: initialDataTimestamps.map((metric) => ({
					AND: [
						{
							avsAddress: metric.avsAddress,
							strategyAddress: metric.strategyAddress
						},
						{
							timestamp: {
								gte: metric._max.timestamp, // Guarantees correct initial data for cumulative queries
								lte: endTimestamp
							}
						}
					]
				})) as Prisma.Prisma.MetricAvsStrategyHourlyWhereInput[]
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		const tvlEth =
			variant === 'cumulative'
				? await getInitialTvlCumulativeFromNative(strategyData, ethPrices)
				: 0

		return { strategyData, tvlEth }
	}

	let [{ hourlyData, totalOperators, totalStakers }, { strategyData, tvlEth }] =
		await Promise.all([
			processMetricHourlyData(),
			processMetricStrategyHourlyData()
		])

	let strategyAddresses = [
		...new Set(strategyData.map((data) => data.strategyAddress))
	]

	// Gather the remaining strategies that might not currently be in the strategyData
	const remainingStrategyData = await prisma.metricAvsStrategyHourly.findMany({
		where: {
			AND: [
				{
					avsAddress: address.toLowerCase(),
					strategyAddress: {
						notIn: strategyAddresses
					}
				},
				{
					timestamp: {
						gt: startTimestamp,
						lte: endTimestamp
					}
				}
			]
		},
		orderBy: {
			timestamp: 'asc'
		}
	})

	strategyData = [...strategyData, ...remainingStrategyData]
	strategyAddresses = [
		...new Set(strategyData.map((data) => data.strategyAddress))
	]

	const results: HistoricalAggregateRecord[] = []
	let currentTimestamp = startTimestamp
	const offset = getOffsetInMs(frequency)

	// Process results per timestamp
	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)

		const intervalHourlyData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// Calculate metrics data for the current timestamp
		const { totalStakers: newStakers, totalOperators: newOperators } =
			await calculateMetricsForHistoricalRecord(
				intervalHourlyData,
				variant,
				totalStakers,
				totalOperators
			)

		totalStakers = newStakers
		totalOperators = newOperators

		let intervalStrategyData = strategyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// For each unique strategy address not present in this interval, add its latest record
		const presentAddresses = new Set(
			intervalStrategyData.map((data) => data.strategyAddress)
		)
		const missingRecords = strategyAddresses.flatMap((address) => {
			if (!presentAddresses.has(address)) {
				const latestRecord = strategyData
					.filter(
						(data) =>
							data.strategyAddress === address && data.timestamp < nextTimestamp
					)
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

				return latestRecord ? [latestRecord] : []
			}
			return []
		})
		intervalStrategyData = [...intervalStrategyData, ...missingRecords]

		// Calculate tvl data for the current timestamp
		tvlEth = calculateTvlForHistoricalRecord(
			intervalStrategyData,
			variant,
			tvlEth,
			modelNameTvl,
			ethPrices
		)
		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth,
			totalStakers,
			totalOperators
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

/**
 * Processes TVL in ETH, totalStakers & totalOperators in historical format
 *
 * @param address
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalOperatorsAggregate(
	address: string,
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	const startTimestamp = resetTime(new Date(startAt))
	const endTimestamp = resetTime(new Date(endAt))
	const modelNameTvl = 'metricOperatorStrategyHourly' as MetricModelName

	const ethPrices = await fetchCurrentEthPrices()

	// Fetch initial data for metrics calculation
	const processMetricHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamp = await prisma.metricOperatorHourly.groupBy({
			by: ['operatorAddress'],
			_max: {
				timestamp: true
			},
			where: {
				timestamp: {
					lte: startTimestamp
				},
				operatorAddress: address.toLowerCase()
			}
		})

		// Fetch all records from the initialDataTimestamp
		const hourlyData = await prisma.metricOperatorHourly.findMany({
			where: {
				operatorAddress: address.toLowerCase(),
				timestamp: {
					gte: initialDataTimestamp[0]?._max.timestamp || startTimestamp, // Guarantees correct initial data for cumulative queries
					lte: endTimestamp
				}
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		let totalStakers = 0
		let totalAvs = 0

		if (variant === 'cumulative' && initialDataTimestamp[0]?._max.timestamp) {
			totalStakers = hourlyData[0].totalStakers
			totalAvs = hourlyData[0].totalAvs
		}

		return { hourlyData, totalStakers, totalAvs }
	}

	// Fetch initial data for tvlEth calculation
	const processMetricStrategyHourlyData = async () => {
		// Fetch the timestamp of the first record on or before startTimestamp
		const initialDataTimestamps =
			await prisma.metricOperatorStrategyHourly.groupBy({
				by: ['operatorAddress', 'strategyAddress'],
				_max: {
					timestamp: true
				},
				where: {
					timestamp: {
						lte: startTimestamp
					},
					operatorAddress: address.toLowerCase()
				}
			})

		// For every strategyAddress, fetch all records from the initialDataTimestamp
		const strategyData = await prisma.metricOperatorStrategyHourly.findMany({
			where: {
				OR: initialDataTimestamps.map((metric) => ({
					AND: [
						{
							operatorAddress: metric.operatorAddress,
							strategyAddress: metric.strategyAddress
						},
						{
							timestamp: {
								gte: metric._max.timestamp, // Guarantees correct initial data for cumulative queries
								lte: endTimestamp
							}
						}
					]
				})) as Prisma.Prisma.MetricOperatorStrategyHourlyWhereInput[]
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

		const tvlEth =
			variant === 'cumulative'
				? await getInitialTvlCumulativeFromNative(strategyData, ethPrices)
				: 0

		return { strategyData, tvlEth }
	}

	let [{ hourlyData, totalAvs, totalStakers }, { strategyData, tvlEth }] =
		await Promise.all([
			processMetricHourlyData(),
			processMetricStrategyHourlyData()
		])

	let strategyAddresses = [
		...new Set(strategyData.map((data) => data.strategyAddress))
	]

	// Gather the remaining strategies that might not currently be in the strategyData
	const remainingStrategyData =
		await prisma.metricOperatorStrategyHourly.findMany({
			where: {
				AND: [
					{
						operatorAddress: address.toLowerCase(),
						strategyAddress: {
							notIn: strategyAddresses
						}
					},
					{
						timestamp: {
							gt: startTimestamp,
							lte: endTimestamp
						}
					}
				]
			},
			orderBy: {
				timestamp: 'asc'
			}
		})

	strategyData = [...strategyData, ...remainingStrategyData]
	strategyAddresses = [
		...new Set(strategyData.map((data) => data.strategyAddress))
	]

	const results: HistoricalAggregateRecord[] = []
	let currentTimestamp = startTimestamp
	const offset = getOffsetInMs(frequency)

	// Process results per timestamp
	while (currentTimestamp <= endTimestamp) {
		const nextTimestamp = new Date(currentTimestamp.getTime() + offset)

		const intervalHourlyData = hourlyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// Calculate metrics data for the current timestamp
		const { totalStakers: newStakers, totalAvs: newAvs } =
			await calculateMetricsForHistoricalRecord(
				intervalHourlyData,
				variant,
				totalStakers,
				undefined,
				totalAvs
			)

		totalStakers = newStakers
		totalAvs = newAvs

		let intervalStrategyData = strategyData.filter(
			(data) =>
				data.timestamp >= currentTimestamp && data.timestamp < nextTimestamp
		)

		// For each unique strategy address not present in this interval, add its latest record
		const presentAddresses = new Set(
			intervalStrategyData.map((data) => data.strategyAddress)
		)
		const missingRecords = strategyAddresses.flatMap((address) => {
			if (!presentAddresses.has(address)) {
				const latestRecord = strategyData
					.filter(
						(data) =>
							data.strategyAddress === address && data.timestamp < nextTimestamp
					)
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

				return latestRecord ? [latestRecord] : []
			}
			return []
		})
		intervalStrategyData = [...intervalStrategyData, ...missingRecords]

		// Calculate tvl data for the current timestamp
		tvlEth = calculateTvlForHistoricalRecord(
			intervalStrategyData,
			variant,
			tvlEth,
			modelNameTvl,
			ethPrices
		)
		results.push({
			timestamp: new Date(Number(currentTimestamp)).toISOString(),
			tvlEth,
			totalStakers,
			totalAvs
		})

		currentTimestamp = nextTimestamp
	}

	return results
}

// --- Historical Count Routes ---

/**
 * Processes total count in historical format
 *
 * @param modelName
 * @param startAt
 * @param endAt
 * @param frequency
 * @param variant
 * @returns
 */
async function doGetHistoricalCount(
	modelName: 'avs' | 'operator' | 'staker' | 'withdrawalQueued' | 'deposit',
	startAt: string,
	endAt: string,
	frequency: string,
	variant: string
) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const model = prisma[modelName] as any

	const startDate = resetTime(new Date(startAt))
	const endDate = resetTime(new Date(endAt))

	const getInitialTally = model.count({
		where: {
			createdAt: {
				lt: startDate
			}
		}
	})

	const getModelData = model.findMany({
		select: {
			createdAt: true
		},
		where: {
			createdAt: {
				gte: startDate,
				lte: endDate
			}
		},
		orderBy: {
			createdAt: 'asc'
		}
	})

	const [initialTally, modelData] = await Promise.all([
		getInitialTally,
		getModelData
	])

	const results: { timestamp: string; value: number }[] = []
	const offset = getOffsetInMs(frequency)

	let currentDate = startDate
	let tally = initialTally

	while (currentDate <= endDate) {
		const nextDate = new Date(currentDate.getTime() + offset)

		const intervalData = modelData.filter(
			(data: { createdAt: number }) =>
				data.createdAt >= currentDate.getTime() &&
				data.createdAt < nextDate.getTime()
		)

		if (variant === 'discrete') {
			results.push({
				timestamp: new Date(Number(currentDate)).toISOString(),
				value: intervalData.length
			})
		} else {
			tally += intervalData.length
			results.push({
				timestamp: new Date(Number(currentDate)).toISOString(),
				value: tally
			})
		}

		currentDate = nextDate
	}

	return results
}

/**
 * Calculates the Restaking Ratio and optionally includes 24-hour and 7-day changes.
 *
 * @param withChange
 * @returns 
 */
async function doGetRestakingRatio(withChange: boolean): Promise<RatioWithoutChange | RatioWithChange> {

    const tvlRestaking = (await doGetTvl(withChange)).tvlRestaking
    const tvlBeaconChain = await doGetTvlBeaconChain(withChange)

    const restakingTvlValue = extractTvlValue(tvlRestaking)
    const beaconChainTvlValue = extractTvlValue(tvlBeaconChain)

    const ethSupplyData = await fetchEthCirculatingSupply(withChange)
    const currentEthCirculation = ethSupplyData.current_circulating_supply

    const totalTvl = restakingTvlValue + beaconChainTvlValue

    const currentRestakingRatio = totalTvl / currentEthCirculation
    if (!withChange) {
        return currentRestakingRatio as RatioWithoutChange
    }

    const ethCirculation24hAgo = (ethSupplyData as CirculatingSupplyWithChange).supply_24h_ago
    const ethCirculation7dAgo = (ethSupplyData as CirculatingSupplyWithChange).supply_7d_ago

    const tvlEth24hChange = (tvlRestaking as TvlWithChange).change24h.value + (tvlBeaconChain as TvlWithChange).change24h.value
    const tvlEth7dChange = (tvlRestaking as TvlWithChange).change7d.value + (tvlBeaconChain as TvlWithChange).change7d.value

    const tvlEth24hAgo = totalTvl - tvlEth24hChange
    const tvlEth7dAgo = totalTvl - tvlEth7dChange

    const restakingRatio24hAgo = tvlEth24hAgo / ethCirculation24hAgo
    const restakingRatio7dAgo = tvlEth7dAgo / ethCirculation7dAgo

    const change24hValue = currentRestakingRatio - restakingRatio24hAgo
    const change24hPercent =
        restakingRatio24hAgo !== 0
            ? Math.round((change24hValue / restakingRatio24hAgo) * 1000) / 1000
            : 0

    const change7dValue = currentRestakingRatio - restakingRatio7dAgo
    const change7dPercent =
        restakingRatio7dAgo !== 0
            ? Math.round((change7dValue / restakingRatio7dAgo) * 1000) / 1000
            : 0

    return ({
        ratio: currentRestakingRatio,
        change24h: {
            value: change24hValue,
            percent: change24hPercent * 100
        },
        change7d: {
            value: change7dValue,
            percent: change7dPercent * 100
        }
    } as RatioWithChange)
}

/**
 * Calculates the Deployment Ratio and optionally includes 24-hour and 7-day changes.
 *
 * @param withChange
 * @returns 
 */
async function doGetDeploymentRatio(withChange: boolean): Promise<RatioWithoutChange | RatioWithChange> {
    const tvlRestaking = (await doGetTvl(withChange)).tvlRestaking
    const tvlBeaconChain = await doGetTvlBeaconChain(withChange)

    const restakingTvlValue = extractTvlValue(tvlRestaking)
    const beaconChainTvlValue = extractTvlValue(tvlBeaconChain)

    const totalTvl = restakingTvlValue + beaconChainTvlValue

    const ethPrices = await fetchCurrentEthPrices()
    const lastMetricsTimestamps =
        await prisma.metricOperatorStrategyHourly.groupBy({
            by: ['operatorAddress', 'strategyAddress'],
            _max: { timestamp: true }
        })

    const validMetricsTimestamps = lastMetricsTimestamps.filter(
        (metric) => metric._max.timestamp !== null
    )

    const metrics = await prisma.metricOperatorStrategyHourly.findMany({
        where: {
            OR: validMetricsTimestamps.map((metric) => ({
                operatorAddress: metric.operatorAddress,
                strategyAddress: metric.strategyAddress,
                timestamp: metric._max.timestamp as Date
            }))
        }
    })

    let currentDelegationValue = 0

    for (const metric of metrics) {
        currentDelegationValue += Number(metric.tvl) * (ethPrices.get(metric.strategyAddress) || 0)
    }

    const currentDeploymentRatio = currentDelegationValue / totalTvl

    if (!withChange) {
        return currentDeploymentRatio as RatioWithoutChange
    }

    const tvlEth24hChange = (tvlRestaking as TvlWithChange).change24h.value + (tvlBeaconChain as TvlWithChange).change24h.value
    const tvlEth7dChange = (tvlRestaking as TvlWithChange).change7d.value + (tvlBeaconChain as TvlWithChange).change7d.value

    const tvlEth24hAgo = totalTvl - tvlEth24hChange
    const tvlEth7dAgo = totalTvl - tvlEth7dChange

    let changeDelegation24hAgo = 0
    let changeDelegationValue7dAgo = 0

    const historicalRecords = await prisma.metricOperatorStrategyHourly.findMany(
        {
            select: {
                changeTvl: true,
                timestamp: true,
                strategyAddress: true
            },
            where: {
                timestamp: {
                    gte: getTimestamp('7d')
                }
            }
        }
    )

    for (const record of historicalRecords) {
        const changeTvlEth =
            Number(record.changeTvl) * (ethPrices.get(record.strategyAddress) || 0)

        changeDelegation24hAgo +=
            record.timestamp.getTime() >= getTimestamp('24h').getTime()
                ? changeTvlEth
                : 0
        changeDelegationValue7dAgo += changeTvlEth
    }

    const deploymentRatio24hAgo = (currentDelegationValue - changeDelegation24hAgo) / tvlEth24hAgo
    const deploymentRatio7dAgo = (currentDelegationValue - changeDelegationValue7dAgo) / tvlEth7dAgo

    const change24hValue = currentDeploymentRatio - deploymentRatio24hAgo

    const change24hPercent =
        deploymentRatio24hAgo !== 0
            ? Math.round(
                (change24hValue / deploymentRatio24hAgo) *
                1000
            ) / 1000
            : 0


    const change7dValue = currentDeploymentRatio - deploymentRatio7dAgo
    const change7dPercent =
        deploymentRatio7dAgo !== 0
            ? Math.round((change7dValue / deploymentRatio7dAgo) * 1000) / 1000
            : 0

    return ({
        ratio: currentDeploymentRatio,
        change24h: {
            value: change24hValue,
            percent: change24hPercent * 100
        },
        change7d: {
            value: change7dValue,
            percent: change7dPercent * 100
        }
    } as RatioWithChange)
}

/*
=========================
=== Utility Functions ===
=========================
*/

/**
 * Retrieves a Date object set to now or in the past basis an offset
 *
 * @param offset
 * @returns
 */
export function getTimestamp(offset?: string) {
	switch (offset) {
		case '24h': {
			const now = new Date()
			return new Date(new Date().setUTCHours(now.getUTCHours() - 24))
		}
		case '7d': {
			const now = new Date()
			return new Date(new Date().setUTCDate(now.getUTCDate() - 7))
		}
		default:
			return new Date()
	}
}

/**
 * Returns offset values to calcuate consecutive timestamps in historical routes
 *
 * @param frequency
 * @returns
 */
function getOffsetInMs(frequency: string) {
	switch (frequency) {
		case '1h':
			return 3600000
		case '1d':
			return 86400000
		case '7d':
			return 604800000
		default:
			return 3600000
	}
}

/**
 * Sets any date to the beginning of the hour
 *
 * @param date
 * @returns
 */
function resetTime(date: Date) {
	date.setUTCMinutes(0, 0, 0)
	return date
}

/**
 * Fetch a map of latest LST/ETH prices
 *
 * @returns
 */
async function fetchCurrentEthPrices(): Promise<Map<string, number>> {
	const ethPrices = await fetchStrategyTokenPrices()
	const strategyPriceMap = new Map<string, number>()

	for (const [_, tokenPrice] of Object.entries(ethPrices)) {
		if (tokenPrice) {
			strategyPriceMap.set(
				tokenPrice.strategyAddress.toLowerCase(),
				tokenPrice.eth
			)
		}
	}

	strategyPriceMap.set('0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0', 1)

	return strategyPriceMap
}

/**
 * Checks if a given model name is ETH denominated
 *
 * @param value
 * @returns
 */
function checkEthDenomination(modelName: string): modelName is EthTvlModelName {
	const ethTvlModelNames: EthTvlModelName[] = [
		'metricDepositHourly',
		'metricWithdrawalHourly',
		'metricEigenPodsHourly'
	]
	return ethTvlModelNames.includes(modelName as EthTvlModelName)
}

/**
 * Processes 24h/7d total count change
 *
 * @param total
 * @param change24hValue
 * @param change7dValue
 * @returns
 */
async function calculateTotalChange(
	total: number,
	change24hValue: number,
	change7dValue: number,
	precision = 1000
): Promise<TotalWithChange> {
	const change24hPercent =
		change24hValue !== 0
			? Math.round((change24hValue / (total - change24hValue)) * precision) /
			  precision
			: 0

	const change7dPercent =
		change7dValue !== 0
			? Math.round((change7dValue / (total - change7dValue)) * precision) /
			  precision
			: 0

	return {
		total,
		change24h: {
			value: change24hValue,
			percent: change24hPercent
		},
		change7d: {
			value: change7dValue,
			percent: change7dPercent
		}
	}
}

/**
 * Processes 24h/7d tvl change
 *
 * @param tvlEth
 * @param modelName
 * @param ethPrices
 * @param address
 * @returns
 */
async function calculateTvlChange(
	tvlEth: TvlWithoutChange,
	modelName: MetricModelName,
	ethPrices?: Map<string, number>,
	address?: string
): Promise<TvlWithChange> {
	const isEthDenominated = checkEthDenomination(modelName)

	let tvlEth24hAgo = 0
	let tvlEth7dAgo = 0

	if (!isEthDenominated) {
		if (!ethPrices) {
			throw new Error('ETH prices are required for processing this data')
		}

		let changeTvlEth24hAgo = 0
		let changeTvlEth7dAgo = 0

		// Get all records from 7d ago
		const historicalRecords = await prisma.metricStrategyHourly.findMany({
			where: {
				timestamp: {
					gte: getTimestamp('7d')
				},
				strategyAddress: address ? address : {}
			},
			orderBy: {
				timestamp: 'desc'
			}
		})

		// Calculate the change in TVL
		for (const record of historicalRecords) {
			const changeTvlEth =
				Number(record.changeTvl) * (ethPrices.get(record.strategyAddress) || 0)

			changeTvlEth24hAgo +=
				record.timestamp.getTime() >= getTimestamp('24h').getTime()
					? changeTvlEth
					: 0
			changeTvlEth7dAgo += changeTvlEth
		}

		// Find TVL values 24h/7d ago
		tvlEth24hAgo = tvlEth - changeTvlEth24hAgo
		tvlEth7dAgo = tvlEth - changeTvlEth7dAgo
	} else {
		// Get all records between 7d & 24h ago
		const historicalRecords = await prisma.metricEigenPodsHourly.findMany({
			where: {
				timestamp: {
					lte: getTimestamp('24h'),
					gte: getTimestamp('7d')
				}
			},
			orderBy: {
				timestamp: 'desc'
			}
		})

		// Pick the earliest and latest record
		const [record24hAgo, ...rest] = historicalRecords
		const record7dAgo = rest.pop()

		// Find TVL values 24h/7d ago
		tvlEth24hAgo = Number(record24hAgo?.tvlEth)
		tvlEth7dAgo = Number(record7dAgo?.tvlEth)
	}

	// Calculate change values and percentages
	const change24h = {
		value: tvlEth - tvlEth24hAgo,
		percent: ((tvlEth - tvlEth24hAgo) / tvlEth24hAgo) * 100
	}

	const change7d = {
		value: tvlEth - tvlEth7dAgo,
		percent: ((tvlEth - tvlEth7dAgo) / tvlEth7dAgo) * 100
	}

	return {
		tvl: tvlEth,
		change24h,
		change7d
	}
}

/**
 * Sums the values of two TvlWithChange items and returns a TvlWithChange object
 *
 * @param tvl1
 * @param tvl2
 * @returns
 */
async function combineTvlWithChange(
	tvl1: TvlWithChange,
	tvl2: TvlWithChange
): Promise<TvlWithChange> {
	const combinedTvl = tvl1.tvl + tvl2.tvl
	const combinedChange24h = {
		value: tvl1.change24h.value + tvl2.change24h.value,
		percent: tvl1.change24h.percent + tvl2.change24h.percent
	}
	const combinedChange7d = {
		value: tvl1.change7d.value + tvl2.change7d.value,
		percent: tvl1.change7d.percent + tvl2.change7d.percent
	}

	return {
		tvl: combinedTvl,
		change24h: combinedChange24h,
		change7d: combinedChange7d
	}
}

/**
 * Calculates initial tvlEth for a historical tvl query with variant set to cumulative
 *
 * @param hourlyData
 * @param ethPrices
 * @returns
 */
async function getInitialTvlCumulativeFromNative(
	hourlyData: MetricModelMap[MetricModelName][],
	ethPrices: Map<string, number>
) {
	if (!ethPrices) {
		throw new Error('ETH prices are required for for processing this data')
	}

	// Find the earliest record for each strategy
	const strategyMap = new Map<string, NativeTvlModelMap[NativeTvlModelName]>()
	for (const record of hourlyData as NativeTvlModelMap[NativeTvlModelName][]) {
		const existingRecord = strategyMap.get(record.strategyAddress)
		if (!existingRecord || record.timestamp < existingRecord.timestamp) {
			strategyMap.set(record.strategyAddress, record)
		}
	}

	let tvlEth = 0

	for (const [strategyAddress, record] of strategyMap) {
		const initialTvl = Number(record.tvl)
		const ethPrice = ethPrices?.get(strategyAddress) || 0
		tvlEth += initialTvl * ethPrice
	}

	return tvlEth
}

/**
 * Calculates tvlEth for one record of a historical tvl response
 *
 * @param intervalData
 * @param variant
 * @param previousTvl
 * @param modelName
 * @param ethPrices
 * @returns
 */
function calculateTvlForHistoricalRecord(
	intervalData: MetricModelMap[MetricModelName][],
	variant: string,
	previousTvl: number,
	modelName: MetricModelName,
	ethPrices?: Map<string, number>
): number {
	const isEthDenominated = checkEthDenomination(modelName)

	if (!isEthDenominated && !ethPrices) {
		throw new Error('ETH prices are required for processing this data')
	}

	if (variant === 'cumulative') {
		// Calculate tvlEth as the summation of tvlEth values for the latest record of each strategy
		if (intervalData.length > 0) {
			if (isEthDenominated) {
				const lastRecord = intervalData[
					intervalData.length - 1
				] as EthTvlModelMap[EthTvlModelName]
				return Number(lastRecord.tvlEth)
			}

			// Get the last records of each distinct strategy
			const lastRecordsByStrategy = new Map<
				string,
				NativeTvlModelMap[NativeTvlModelName]
			>()
			for (const record of intervalData) {
				const strategyRecord = record as NativeTvlModelMap[NativeTvlModelName]
				lastRecordsByStrategy.set(
					strategyRecord.strategyAddress,
					strategyRecord
				)
			}

			// Calculate tvl in ETH
			return Array.from(lastRecordsByStrategy.values()).reduce(
				(total, strategyRecord) => {
					return (
						total +
						Number(strategyRecord.tvl) *
							(ethPrices?.get(strategyRecord.strategyAddress) || 0)
					)
				},
				0
			)
		}

		return previousTvl // If no records exist in the time period, previous tvl value is returned
	}

	// Calculate tvlEth as the summation of all changeTvlEth
	return intervalData.reduce((sum, record) => {
		if (isEthDenominated) {
			const intervalRecord = record as EthTvlModelMap[EthTvlModelName]
			return sum + Number(intervalRecord.changeTvlEth)
		}

		const intervalRecord = record as NativeTvlModelMap[NativeTvlModelName]
		const ethPrice = ethPrices?.get(intervalRecord.strategyAddress) || 0
		return sum + Number(intervalRecord.changeTvl) * ethPrice
	}, 0)
}

/**
 * Calculates totalStakers, totalOperators/totalAvs for one record of a historical aggregate response
 *
 * @param intervalHourlyData
 * @param variant
 * @param totalStakers
 * @param totalOperators
 * @param totalAvs
 * @returns
 */
async function calculateMetricsForHistoricalRecord(
	intervalHourlyData: AggregateModelMap[AggregateModelName][],
	variant: string,
	totalStakers: number,
	totalOperators?: number,
	totalAvs?: number
) {
	let newStakers = totalStakers
	let newOperators = totalOperators || 0
	let newAvs = totalAvs || 0

	if (variant === 'cumulative') {
		// Grab metrics from the latest record
		if (intervalHourlyData.length > 0) {
			const lastRecordIndex = intervalHourlyData.length - 1

			newStakers = intervalHourlyData[lastRecordIndex].totalStakers

			newOperators =
				totalOperators !== undefined && totalOperators !== null
					? (
							intervalHourlyData[
								lastRecordIndex
							] as AggregateModelMap['metricAvsHourly']
					  ).totalOperators
					: 0

			newAvs =
				totalAvs !== undefined && totalAvs !== null
					? (
							intervalHourlyData[
								lastRecordIndex
							] as AggregateModelMap['metricOperatorHourly']
					  ).totalAvs
					: 0
		}
	} else {
		// Calculate metrics as summation of all change values
		newStakers = intervalHourlyData.reduce(
			(sum, record) => sum + record.changeStakers,
			0
		)

		newOperators =
			totalOperators !== undefined && totalOperators !== null
				? (intervalHourlyData as AggregateModelMap['metricAvsHourly'][]).reduce(
						(sum, record) => sum + record.changeOperators,
						0
				  )
				: 0

		newAvs =
			totalAvs !== undefined && totalAvs !== null
				? (
						intervalHourlyData as AggregateModelMap['metricOperatorHourly'][]
				  ).reduce((sum, record) => sum + record.changeAvs, 0)
				: 0
	}

	return {
		totalStakers: newStakers,
		totalOperators: newOperators,
		totalAvs: newAvs
	}
}

/**
 * Extracts the TVL value from a TvlWithChange object or directly returns the number.
 *
 * @param tvl
 * @returns
 */
function extractTvlValue(tvl: number | TvlWithChange): number {
    return (tvl as TvlWithChange).tvl || (tvl as number)
}