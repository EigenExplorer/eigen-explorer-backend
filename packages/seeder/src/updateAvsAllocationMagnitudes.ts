import { Prisma } from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'
import { getViemClient } from './utils/viemClient'

export async function updateAvsAllocationMagnitudes() {
	const prismaClient = getPrismaClient()

	const currentBlock = await getViemClient().getBlockNumber()

	// Fetch AvsAllocation records where pendingDiff != 0 and effectBlock <= currentBlock
	const allocationsToUpdate = await prismaClient.avsAllocation.findMany({
		where: {
			pendingDiff: {
				not: new Prisma.Decimal(0)
			},
			effectBlock: {
				lte: currentBlock // Include only records due or overdue
			}
		}
	})

	const operatorStrategyPairs = allocationsToUpdate.map((allocation) => ({
		operatorAddress: allocation.operatorAddress,
		strategyAddress: allocation.strategyAddress
	}))

	const existingOperatorMagnitudes =
		operatorStrategyPairs.length > 0
			? await prismaClient.operatorStrategyMagnitude.findMany({
					where: {
						OR: operatorStrategyPairs.map((pair) => ({
							operatorAddress: pair.operatorAddress,
							strategyAddress: pair.strategyAddress
						}))
					}
			  })
			: []

	const dbTransactions: any[] = []

	for (const allocation of allocationsToUpdate) {
		const currentMagnitude = new Prisma.Decimal(allocation.currentMagnitude)
		const pendingDiff = new Prisma.Decimal(allocation.pendingDiff)

		const newMagnitude = currentMagnitude.plus(pendingDiff)
		const shouldUpdateEncumbered = pendingDiff.isNegative()

		dbTransactions.push(
			prismaClient.avsAllocation.update({
				where: {
					avsAddress_operatorSetId_operatorAddress_strategyAddress: {
						avsAddress: allocation.avsAddress,
						operatorSetId: allocation.operatorSetId,
						operatorAddress: allocation.operatorAddress,
						strategyAddress: allocation.strategyAddress
					}
				},
				data: {
					currentMagnitude: newMagnitude.toString(),
					pendingDiff: new Prisma.Decimal(0),
					effectBlock: 0n,
					updatedAtBlock: currentBlock,
					updatedAt: new Date()
				}
			})
		)

		// If conditions met, update OperatorStrategyMagnitude
		if (shouldUpdateEncumbered) {
			const existingMagnitude = existingOperatorMagnitudes.find(
				(mag) =>
					mag.operatorAddress === allocation.operatorAddress &&
					mag.strategyAddress === allocation.strategyAddress
			)

			if (existingMagnitude) {
				// Convert existing encumberedMagnitude to Decimal and subtract pendingDiff (which is negative, so add its absolute value)
				const currentEncumbered = new Prisma.Decimal(existingMagnitude.encumberedMagnitude)
				const updatedEncumbered = currentEncumbered.minus(pendingDiff)

				dbTransactions.push(
					prismaClient.operatorStrategyMagnitude.update({
						where: {
							operatorAddress_strategyAddress: {
								operatorAddress: allocation.operatorAddress,
								strategyAddress: allocation.strategyAddress
							}
						},
						data: {
							encumberedMagnitude: updatedEncumbered.toString(),
							updatedAtBlock: currentBlock,
							updatedAt: new Date()
						}
					})
				)
			}
		}
	}

	if (dbTransactions.length > 0) {
		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Data] AVS Allocation Magnitude Updated at block: ${currentBlock}, updated ${dbTransactions.length} records`
		)
	} else {
		console.log(`[Data] No AVS Allocation records updated at block: ${currentBlock}`)
	}
}
