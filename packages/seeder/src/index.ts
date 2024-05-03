import 'dotenv/config'

import { seedAvs } from './seedAvs'
import { seedAvsOperators } from './seedAvsOperators'
import { seedOperators } from './seedOperators'
import { seedPods } from './seedPods'
import { seedStakers } from './seedStakers'
import { getViemClient } from './utils/viemClient'
import { seedOperatorShares } from './seedOperatorShares'

console.log('Initializing seeder ...')

function delay(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

async function seedEigenDataLoop() {
	while (true) {
		const viemClient = getViemClient()
		const targetBlock = await viemClient.getBlockNumber()
		console.log('Seeding Eigen Data ...', targetBlock)

		await seedAvs(targetBlock)
		await seedOperators(targetBlock)
		await seedAvsOperators(targetBlock)
		await seedStakers(targetBlock)
		await seedOperatorShares(targetBlock)
		await seedPods(targetBlock)

		await delay(120) // Wait for 2 minutes (120 seconds)
	}
}

seedEigenDataLoop()