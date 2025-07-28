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
		orderBy: [{ timestamp: 'asc' }]
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

interface RegistrationEvent {
	avs: string
	blockTime: Date
	status: number // 1 = registered, 0 = deregistered
}

async function fetchOperatorAvsRegistrationData(
	operatorAddress: string,
	avsAddresses: string[],
	startDate: Date = new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
	endDate: Date = new Date()
): Promise<RegistrationEvent[]> {
	try {
		// Normalize dates to start of day
		startDate = new Date(startDate.setUTCHours(0, 0, 0, 0))
		endDate = new Date(endDate.setUTCHours(0, 0, 0, 0))

		// Fetch registration events within startDate to endDate
		const registrationEvents = await prisma.eventLogs_OperatorAVSRegistrationStatusUpdated.findMany(
			{
				where: {
					operator: {
						equals: operatorAddress,
						mode: 'insensitive'
					},
					OR: avsAddresses.map((addr) => ({
						avs: {
							equals: addr,
							mode: 'insensitive'
						}
					})),
					blockTime: { gte: startDate, lte: endDate }
				},
				orderBy: [{ blockNumber: 'desc' }],
				select: {
					avs: true,
					blockTime: true,
					status: true
				}
			}
		)

		return registrationEvents
	} catch (error) {
		console.error('Error fetching AVS registration events:', error)
		return []
	}
}

interface AvsOperatorData {
	avsAddress: string
	isActive: boolean
}

interface AvsDailyRegistrationMap {
	[dayKey: string]: { [avsAddress: string]: boolean }
}

export async function buildOperatorAvsRegistrationMap(
	operatorAddress: string,
	avsOperators: AvsOperatorData[],
	startDate: Date = new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
	endDate: Date = new Date()
): Promise<AvsDailyRegistrationMap> {
	startDate = new Date(startDate.setUTCHours(0, 0, 0, 0))
	endDate = new Date(endDate.setUTCHours(0, 0, 0, 0))

	const avsRegistrationMap: AvsDailyRegistrationMap = {}

	if (avsOperators.length === 0) {
		return avsRegistrationMap
	}

	const registrationEvents: RegistrationEvent[] = await fetchOperatorAvsRegistrationData(
		operatorAddress,
		avsOperators.map((avsOperator) => avsOperator.avsAddress.toLowerCase()),
		startDate,
		endDate
	)

	// Initialize daily map for all days in [startDate, endDate]
	for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
		const dayKey = day.toISOString().split('T')[0]
		avsRegistrationMap[dayKey] = {}
	}

	// Process each AVS
	for (const avsOperator of avsOperators) {
		const avsAddress = avsOperator.avsAddress.toLowerCase()
		const isActive = avsOperator.isActive

		// Get events for this AVS, sorted by descending blockTime
		const avsEvents = registrationEvents.filter((event) => event.avs.toLowerCase() === avsAddress)

		let currentStatus = isActive
		let periodEnd = new Date(endDate)

		if (avsEvents.length === 0) {
			// No events: Apply isActive to all days
			for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
				const dayKey = day.toISOString().split('T')[0]
				avsRegistrationMap[dayKey][avsAddress] = currentStatus
			}
		} else {
			for (const event of avsEvents) {
				const eventDate = new Date(event.blockTime.setUTCHours(0, 0, 0, 0))
				if (eventDate < startDate) break

				// Fill days from eventDate to periodEnd with currentStatus
				for (
					let day = new Date(eventDate);
					day <= periodEnd && day >= startDate;
					day.setDate(day.getDate() + 1)
				) {
					const dayKey = day.toISOString().split('T')[0]
					avsRegistrationMap[dayKey][avsAddress] = currentStatus
				}

				// Update status and period end
				currentStatus = !currentStatus
				periodEnd = new Date(eventDate)
				periodEnd.setDate(periodEnd.getDate() - 1)
			}

			if (periodEnd >= startDate) {
				for (
					let day = new Date(startDate);
					day <= periodEnd && day <= endDate;
					day.setDate(day.getDate() + 1)
				) {
					const dayKey = day.toISOString().split('T')[0]
					avsRegistrationMap[dayKey][avsAddress] = currentStatus
				}
			}
		}
	}

	return avsRegistrationMap
}
