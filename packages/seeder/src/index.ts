import 'dotenv/config'

import { seedAvs } from './seedAvs'
import { seedAvsOperators } from './seedAvsOperators'
import { seedOperators } from './seedOperators'
import { seedPods } from './seedPods'
import { seedStakers } from './seedStakers'
import { getViemClient } from './utils/viemClient'
import { seedOperatorShares } from './seedOperatorShares'
import { seedValidators } from './seedValidators'
import { seedQueuedWithdrawals } from './seedWithdrawalsQueued'
import { seedCompletedWithdrawals } from './seedWithdrawalsCompleted'
import { monitorAvsMetadata } from './monitors/avsMetadata'
import { monitorOperatorMetadata } from './monitors/operatorMetadata'

console.log('Initializing seeder ...')

function delay(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

async function seedEigenDataLoop() {
	while (true) {
		try {
			const viemClient = getViemClient()
			const targetBlock = await viemClient.getBlockNumber()
			console.log('Seeding Eigen Data ...', targetBlock)

			await seedAvs(targetBlock)
			await seedOperators(targetBlock)
			await seedAvsOperators(targetBlock)
			await seedStakers(targetBlock)
			await seedOperatorShares(targetBlock)
			await seedQueuedWithdrawals(targetBlock)
			await seedCompletedWithdrawals(targetBlock)
		} catch (error) {
			console.log('Failed to seed AVS and Operators at:', Date.now())
		}

		await delay(120) // Wait for 2 minutes (120 seconds)
	}
}

async function seedEigenPodValidators() {
	await delay(60)

	while (true) {
		try {
			const viemClient = getViemClient()
			const targetBlock = await viemClient.getBlockNumber()
			console.log('Seeding Eigen Pods Data ...', targetBlock)

			await seedPods(targetBlock)
			await seedValidators()
		} catch (error) {
			console.log('Failed to seed validators at block:', Date.now())
		}

		await delay(600) // Wait for 10 minutes (600 seconds)
	}
}

async function monitorDBLoop() {
	while (true) {
		try {
			await monitorAvsMetadata()
			await monitorOperatorMetadata()
		} catch (error) {
			console.log('Failed to monitor DB at: ', Date.now())
		}

		await delay(420) // Wait for 7 minutes (420 seconds)
	}
}

seedEigenDataLoop()
seedEigenPodValidators()
monitorDBLoop()
