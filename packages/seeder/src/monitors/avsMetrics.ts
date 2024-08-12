import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { type IMap, bulkUpdateDbTransactions } from '../utils/seeder'

type IEthPrice = IMap<string, number>
type ILastAvsMetric = Omit<prisma.MetricAvsHourly, 'id'>
type ILastAvsMetrics = IMap<string, ILastAvsMetric>
type ILastAvsStrategyMetric = Omit<
	prisma.MetricAvsStrategyHourly,
	'id'
>
type ILastAvsStrategyMetrics = IMap<
	string,
	IMap<string, ILastAvsStrategyMetric>
>

export async function monitorAvsMetrics() {
	const prismaClient = getPrismaClient()
	const ethPrices = await getLatestEthPrices()

	let skip = 0
	const take = 100

	while (true) {
		// Fetch avs addresses for this iteration
		const avsEntries = await prismaClient.avs.findMany({
			take: take,
			skip: skip,
			orderBy: {
				createdAtBlock: 'asc'
			}
		})

		if (avsEntries.length === 0) {
			break
		}

		const avsAddresses = avsEntries.map((record) => record.address)

		// For each avs in this iteration, fetch latest metrics and strategy metrics
		const [avsMetrics, avsStrategyMetrics] = await Promise.all([
			getLatestMetricsPerAvs(avsAddresses),
			getLatestMetricsPerAvsStrategy(avsAddresses)
		])

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []

		for (const avs of avsEntries) {
			try {
				// Grab metrics
				const totalStakers =
					avsMetrics.get(avs.address).totalStakers ||
					avs.totalStakers ||
					0
				const totalOperators =
					avsMetrics.get(avs.address).totalOperators ||
					avs.totalOperators ||
					0

				// Calculate tvlEth from strategy metrics
				let tvlEth = avs.tvlEth || new prisma.Prisma.Decimal(0)
				const strategyMetrics = avsStrategyMetrics.get(avs.address)

				if (strategyMetrics) {
					for (const [address, metrics] of strategyMetrics) {
						const ethPrice = new prisma.Prisma.Decimal(
							ethPrices.get(address) || 0
						)
						tvlEth = tvlEth.add(metrics.tvl.mul(ethPrice))
					}
				}

				dbTransactions.push(
					prismaClient.avs.update({
						where: { address: avs.address },
						data: { totalStakers, totalOperators, tvlEth }
					})
				)
			} catch (error) {}
		}

		if (dbTransactions.length > 0) {
			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Monitor] Updated Avs metrics: ${dbTransactions.length}`
			)
		}
		skip += take
	}

	console.log('[Monitor] All Avs metrics up-to-date')
}

/**
 * Get latest metrics per avs
 *
 * @returns
 */
async function getLatestMetricsPerAvs(
	avsAddresses: string[]
): Promise<ILastAvsMetrics> {
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerAvs =
			await prismaClient.metricAvsHourly.groupBy({
				by: ['avsAddress'],
				_max: {
					timestamp: true
				},
				where: {
					avsAddress: {
						in: avsAddresses
					}
				}
			})

		const metrics = await prismaClient.metricAvsHourly.findMany({
			where: {
				OR: lastMetricsPerAvs.map((metric) => ({
					avsAddress: metric.avsAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricAvsHourlyWhereInput[]
			},
			orderBy: {
				avsAddress: 'asc'
			}
		})

		return metrics
			? new Map(metrics.map((metric) => [metric.avsAddress, metric]))
			: new Map()
	} catch {}

	return new Map()
}

/**
 * Get latest metrics per Avs strategy
 *
 * @returns
 */
async function getLatestMetricsPerAvsStrategy(
	avsAddresses: string[]
): Promise<ILastAvsStrategyMetrics> {
	const groupedMetrics: ILastAvsStrategyMetrics = new Map()
	const prismaClient = getPrismaClient()

	try {
		const lastMetricsPerAvsStrategy =
			await prismaClient.metricAvsStrategyHourly.groupBy({
				by: ['avsAddress', 'strategyAddress'],
				_max: {
					timestamp: true
				},
				where: {
					avsAddress: {
						in: avsAddresses
					}
				}
			})

		const metrics = await prismaClient.metricAvsStrategyHourly.findMany({
			where: {
				OR: lastMetricsPerAvsStrategy.map((metric) => ({
					avsAddress: metric.avsAddress,
					strategyAddress: metric.strategyAddress,
					timestamp: metric._max.timestamp
				})) as prisma.Prisma.MetricAvsStrategyHourlyWhereInput[]
			},
			orderBy: {
				avsAddress: 'asc'
			}
		})

		for (const metric of metrics) {
			const { avsAddress, strategyAddress } = metric

			if (!groupedMetrics.has(avsAddress)) {
				groupedMetrics.set(avsAddress, new Map())
			}

			const avsMetrics = groupedMetrics.get(avsAddress)

			const metricWithoutId: ILastAvsStrategyMetric = {
				avsAddress: metric.avsAddress,
				strategyAddress: metric.strategyAddress,
				tvl: metric.tvl,
				changeTvl: metric.changeTvl,
				timestamp: metric.timestamp
			}

			avsMetrics.set(strategyAddress, metricWithoutId)
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
