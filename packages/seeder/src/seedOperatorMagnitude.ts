import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_operatorMagnitude'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorMagnitude'

interface IMagnitude {
	maxMagnitude: string
	encumberedMagnitude: string
	strategyAddress: string
}

export async function seedOperatorMagnitude(toBlock?: bigint, fromBlock?: bigint) {
	const prismaClient = getPrismaClient()
	const operatorMagnitudes: Map<string, IMagnitude[]> = new Map()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock ? toBlock : await fetchLastSyncBlock(blockSyncKeyLogs)

	if (lastBlock - firstBlock <= 0) {
		console.log(`[In Sync] [Data] Operator Magnitudes from: ${firstBlock} to: ${lastBlock}`)
		return
	}

	if (firstBlock === baseBlock) {
		await prismaClient.operatorStrategyMagnitude.deleteMany()
	}

	await loopThroughBlocks(
		firstBlock,
		lastBlock,
		async (fromBlock, toBlock) => {
			let allLogs: any[] = []

			await prismaClient.eventLogs_MaxMagnitudeUpdated
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [
						...allLogs,
						...logs.map((log) => ({
							...log,
							eventName: 'MaxMagnitudeUpdated'
						}))
					]
				})

			await prismaClient.eventLogs_EncumberedMagnitudeUpdated
				.findMany({ where: { blockNumber: { gt: fromBlock, lte: toBlock } } })
				.then((logs) => {
					allLogs = [
						...allLogs,
						...logs.map((log) => ({
							...log,
							eventName: 'EncumberedMagnitudeUpdated'
						}))
					]
				})

			allLogs = allLogs.sort((a, b) => {
				if (a.blockNumber === b.blockNumber) {
					return a.transactionIndex - b.transactionIndex
				}
				return Number(a.blockNumber - b.blockNumber)
			})

			// Get existing magnitudes for operators in logs
			const operatorAddresses = allLogs.map((l) => String(l.operator).toLowerCase())
			const operatorInit =
				firstBlock !== baseBlock
					? await prismaClient.operatorStrategyMagnitude.findMany({
							where: { operatorAddress: { in: operatorAddresses } }
					  })
					: []

			for (const log of allLogs) {
				const operatorAddress = log.operator.toLowerCase()
				const strategyAddress = log.strategy.toLowerCase()

				if (!operatorMagnitudes.has(operatorAddress)) {
					// Get existing magnitudes for this operator
					const existingMagnitudes = operatorInit.filter(
						(o) => o.operatorAddress.toLowerCase() === operatorAddress.toLowerCase()
					)
					operatorMagnitudes.set(operatorAddress, [])

					if (existingMagnitudes.length > 0) {
						operatorMagnitudes.set(
							operatorAddress,
							existingMagnitudes.map((o) => ({
								strategyAddress: o.strategyAddress,
								maxMagnitude: o.maxMagnitude,
								encumberedMagnitude: o.encumberedMagnitude
							}))
						)
					}
				}

				let foundMagnitude = operatorMagnitudes
					.get(operatorAddress)!
					.find((m) => m.strategyAddress.toLowerCase() === strategyAddress)

				if (!foundMagnitude) {
					// New operator/strategy pair - use default values
					foundMagnitude = {
						strategyAddress,
						maxMagnitude: '1000000000000000000', // Default to 1e18
						encumberedMagnitude: '0'
					}
					operatorMagnitudes.get(operatorAddress)!.push(foundMagnitude)
				}

				if (log.eventName === 'MaxMagnitudeUpdated') {
					foundMagnitude.maxMagnitude = log.maxMagnitude
				} else if (log.eventName === 'EncumberedMagnitudeUpdated') {
					foundMagnitude.encumberedMagnitude = log.encumberedMagnitude
				}
			}

			console.log(`[Batch] Operator Magnitudes from: ${fromBlock} to: ${toBlock}`)
		},
		10_000n
	)

	const dbTransactions: any[] = []

	if (firstBlock === baseBlock) {
		dbTransactions.push(prismaClient.operatorStrategyMagnitude.deleteMany())

		const newOperatorMagnitudes: any[] = []

		for (const [operatorAddress, magnitudes] of operatorMagnitudes) {
			magnitudes.forEach((magnitude) => {
				newOperatorMagnitudes.push({
					operatorAddress,
					...magnitude
				})
			})
		}

		dbTransactions.push(
			prismaClient.operatorStrategyMagnitude.createMany({
				data: newOperatorMagnitudes,
				skipDuplicates: true
			})
		)
	} else {
		for (const [operatorAddress, magnitudes] of operatorMagnitudes) {
			magnitudes.forEach((magnitude) => {
				dbTransactions.push(
					prismaClient.operatorStrategyMagnitude.upsert({
						where: {
							operatorAddress_strategyAddress: {
								operatorAddress,
								strategyAddress: magnitude.strategyAddress
							}
						},
						create: {
							operatorAddress,
							...magnitude
						},
						update: {
							maxMagnitude: magnitude.maxMagnitude,
							encumberedMagnitude: magnitude.encumberedMagnitude
						}
					})
				)
			})
		}
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Operator Magnitudes from: ${firstBlock} to: ${lastBlock} size: ${operatorMagnitudes.size}`
	)

	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
