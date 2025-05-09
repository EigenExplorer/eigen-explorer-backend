import prisma from './prismaClient'
import Prisma from '@prisma/client'
import { fetchCurrentEthPrices } from '../routes/metrics/metricController'

interface DailyAvsStrategyTvlMap {
	[dayKey: string]: { [avsAddress: string]: { [strategyAddress: string]: number } }
}

export async function getDailyAvsStrategyTvl(
	avsStrategyPairs: { avsAddress: string; strategyAddress: string }[],
	startDate: Date,
	endDate: Date
): Promise<DailyAvsStrategyTvlMap> {
	startDate = new Date(startDate.setUTCHours(0, 0, 0, 0))
	endDate = new Date(endDate.setUTCHours(0, 0, 0, 0))

	const dailyTvlMap: DailyAvsStrategyTvlMap = {}

	const dayKeys: string[] = []
	for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
		const dayKey = day.toISOString().split('T')[0]
		dayKeys.push(dayKey)
		dailyTvlMap[dayKey] = {}
	}

	if (avsStrategyPairs.length === 0) {
		return dailyTvlMap
	}

	const strategyPriceMap = await fetchCurrentEthPrices()

	// Fetch TVL records
	const tvlRecords = await prisma.metricAvsStrategyUnit.findMany({
		where: {
			OR: avsStrategyPairs.map(({ avsAddress, strategyAddress }) => ({
				avsAddress: avsAddress.toLowerCase(),
				strategyAddress: strategyAddress.toLowerCase()
			})),
			timestamp: {
				gte: startDate,
				lte: endDate
			}
		},
		select: {
			avsAddress: true,
			strategyAddress: true,
			tvl: true,
			timestamp: true
		},
		orderBy: [{ avsAddress: 'asc' }, { strategyAddress: 'asc' }, { timestamp: 'asc' }]
	})

	// Group records by AVS-strategy pair and convert TVL to ETH
	const recordsByPair = new Map<string, Array<{ timestamp: Date; tvl: number }>>()
	for (const record of tvlRecords) {
		const key = `${record.avsAddress}:${record.strategyAddress}`
		if (!recordsByPair.has(key)) {
			recordsByPair.set(key, [])
		}
		const ethPrice = strategyPriceMap.get(record.strategyAddress.toLowerCase())
		let tvlEth = 0
		if (ethPrice && ethPrice > 0) {
			// Convert TVL from native token to ETH
			tvlEth = record.tvl.mul(new Prisma.Prisma.Decimal(ethPrice)).toNumber()
		}
		recordsByPair.get(key)!.push({
			timestamp: record.timestamp,
			tvl: tvlEth
		})
	}

	// Fill daily TVL map
	for (const { avsAddress, strategyAddress } of avsStrategyPairs) {
		const avsAddr = avsAddress.toLowerCase()
		const stratAddr = strategyAddress.toLowerCase()
		const key = `${avsAddr}:${stratAddr}`
		const records = recordsByPair.get(key) || []

		let currentTvl = 0
		let recordIndex = 0

		for (const dayKey of dayKeys) {
			const dayDate = new Date(dayKey)
			while (
				recordIndex < records.length &&
				new Date(records[recordIndex].timestamp).setUTCHours(0, 0, 0, 0) <= dayDate.getTime()
			) {
				currentTvl = records[recordIndex].tvl
				recordIndex++
			}

			if (!dailyTvlMap[dayKey][avsAddr]) {
				dailyTvlMap[dayKey][avsAddr] = {}
			}
			dailyTvlMap[dayKey][avsAddr][stratAddr] = currentTvl
		}
	}

	return dailyTvlMap
}
