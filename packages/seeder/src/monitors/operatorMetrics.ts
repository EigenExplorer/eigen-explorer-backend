import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { type IMap, bulkUpdateDbTransactions } from '../utils/seeder'

type IEthPrice = IMap<string, number>
type ILastOperatorMetric = Omit<prisma.MetricOperatorHourly, 'id'>
type ILastOperatorMetrics = IMap<string, ILastOperatorMetric>
type ILastOperatorStrategyMetric = Omit<
	prisma.MetricOperatorStrategyHourly,
	'id'
>
type ILastOperatorStrategyMetrics = IMap<
	string,
	IMap<string, ILastOperatorStrategyMetric>
>

export async function monitorOperatorMetrics() {
	const prismaClient = getPrismaClient()
	const ethPrices = await getLatestEthPrices()

	let skip = 0
	const take = 100

	while (true) {
		// Fetch operator addresses for this iteration
		const operatorEntries = await prismaClient.operator.findMany({
			take: take,
			skip: skip,
			orderBy: {
				createdAtBlock: 'asc'
			}
		})

		if (operatorEntries.length === 0) {
			break
		}

		const operatorAddresses = operatorEntries.map((record) => record.address)

		// For each operator in this iteration, fetch latest metrics and strategy metrics
		const [operatorMetrics, operatorStrategyMetrics] = await Promise.all([
			getLatestMetricsPerOperator(operatorAddresses),
			getLatestMetricsPerOperatorStrategy(operatorAddresses)
		])

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []

		for (const operator of operatorEntries) {
			try {
				// Grab metrics
				const totalStakers =
					operatorMetrics.get(operator.address).totalStakers ||
					operator.totalStakers ||
					0
				const totalAvs =
					operatorMetrics.get(operator.address).totalAvs ||
					operator.totalAvs ||
					0

				// Calculate tvlEth from strategy metrics
				let tvlEth = operator.tvlEth || new prisma.Prisma.Decimal(0)
				const strategyMetrics = operatorStrategyMetrics.get(operator.address)

				if (strategyMetrics) {
					for (const [address, metrics] of strategyMetrics) {
						const ethPrice = new prisma.Prisma.Decimal(
							ethPrices.get(address) || 0
						)
						tvlEth = tvlEth.add(metrics.tvl.mul(ethPrice))
					}
				}

				dbTransactions.push(
					prismaClient.operator.update({
						where: { address: operator.address },
						data: { totalStakers, totalAvs, tvlEth }
					})
				)
			} catch (error) {}
		}

		if (dbTransactions.length > 0) {
			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Monitor] Updated Operator metrics: ${dbTransactions.length}`
			)
		}
		skip += take
	}

	console.log('[Monitor] All Operator metrics up-to-date')
}

/**
 * Get latest metrics per operator
 *
 * @returns
 */
async function getLatestMetricsPerOperator(
	operatorAddresses: string[]
): Promise<ILastOperatorMetrics> {
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerOperator =
			await prismaClient.metricOperatorHourly.groupBy({
				by: ['operatorAddress'],
				_max: {
					timestamp: true
				},
				where: {
					operatorAddress: {
						in: operatorAddresses
					}
				}
			})

		const metrics = await prismaClient.metricOperatorHourly.findMany({
			where: {
				OR: lastMetricsPerOperator.map((metric) => ({
					operatorAddress: metric.operatorAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricOperatorHourlyWhereInput[]
			},
			orderBy: {
				operatorAddress: 'asc'
			}
		})

		return metrics
			? new Map(metrics.map((metric) => [metric.operatorAddress, metric]))
			: new Map()
	} catch {}

	return new Map()
}

/**
 * Get latest metrics per Operator strategy
 *
 * @returns
 */
async function getLatestMetricsPerOperatorStrategy(
	operatorAddresses: string[]
): Promise<ILastOperatorStrategyMetrics> {
	const groupedMetrics: ILastOperatorStrategyMetrics = new Map()
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerOperatorStrategy =
			await prismaClient.metricOperatorStrategyHourly.groupBy({
				by: ['operatorAddress', 'strategyAddress'],
				_max: {
					timestamp: true
				},
				where: {
					operatorAddress: {
						in: operatorAddresses
					}
				}
			})

		const metrics = await prismaClient.metricOperatorStrategyHourly.findMany({
			where: {
				OR: lastMetricsPerOperatorStrategy.map((metric) => ({
					operatorAddress: metric.operatorAddress,
					strategyAddress: metric.strategyAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricOperatorStrategyHourlyWhereInput[]
			},
			orderBy: {
				operatorAddress: 'asc'
			}
		})

		for (const metric of metrics) {
			const { operatorAddress, strategyAddress } = metric

			if (!groupedMetrics.has(operatorAddress)) {
				groupedMetrics.set(operatorAddress, new Map())
			}

			const operatorMetrics = groupedMetrics.get(operatorAddress)

			const metricWithoutId: ILastOperatorStrategyMetric = {
				operatorAddress: metric.operatorAddress,
				strategyAddress: metric.strategyAddress,
				tvl: metric.tvl,
				changeTvl: metric.changeTvl,
				timestamp: metric.timestamp
			}

			operatorMetrics.set(strategyAddress, metricWithoutId)
		}
	} catch {}

	return groupedMetrics
}

/**
 * Get latest LST prices for all strategies
 *
 * @returns
 */
async function getLatestEthPrices(): Promise<IEthPrice> {
	const prismaClient = getPrismaClient()

	const ethPriceData = await prismaClient.ethPricesDaily.findMany({
		distinct: ['symbol'],
		orderBy: {
			timestamp: 'desc'
		}
	})

	const strategiesData = await prismaClient.strategies.findMany({
		select: {
			address: true,
			symbol: true
		}
	})

	const ethPrices: IEthPrice = new Map()

	for (const strategy of strategiesData) {
		const ethPrice = ethPriceData.find(
			(price) => price.symbol === strategy.symbol
		)
		if (ethPrice) {
			ethPrices.set(strategy.address, Number(ethPrice.ethPrice))
		}
	}

	ethPrices.set('0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0', 1)

	return ethPrices
}
