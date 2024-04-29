import 'dotenv/config'

import { seedValidators } from './seedValidators'
import { seedAvs } from './seedAvs'
import { seedAvsOperators } from './seedAvsOperators'
import { seedOperators } from './seedOperators'
import { seedPods } from './seedPods'
import { seedValidatorsRestake } from './seedValidatorsRestake'
import { seedStakers } from './seedStakers'
import { getViemClient } from './utils/viemClient'

console.log('Initializing seeder ...')

function delay(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

async function seedAvsLoop() {
	while (true) {
		const viemClient = getViemClient()
		const targetBlock = await viemClient.getBlockNumber()
		console.log('Seeding AVS & Operators ...', targetBlock)

		await seedAvs(targetBlock)
		await seedOperators(targetBlock)
		await seedAvsOperators(targetBlock)
		await seedStakers(targetBlock)

		await delay(120) // Wait for 2 minutes (120 seconds)
	}
}

async function seedPodsLoop() {
	while (true) {
		await delay(600)
		const viemClient = getViemClient()
		const targetBlock = await viemClient.getBlockNumber()

		console.log('Seeding Pods & Validators ...', targetBlock)
		await seedPods(targetBlock)
		await seedValidatorsRestake(targetBlock)
		await seedValidators()
	}
}

seedAvsLoop()
seedPodsLoop()
