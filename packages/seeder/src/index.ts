import 'dotenv/config'
import cron from 'node-cron'

import { seedValidators } from './seedValidators'
import { seedAvs } from './seedAvs'
import { seedAvsOperators } from './seedAvsOperators'
import { seedOperators } from './seedOperators'
import { seedPods } from './seedPods'
import { seedValidatorsRestake } from './seedValidatorsRestake'
import { seedStakers } from './seedStakers'
import { seedOperatorShares } from './seedOperatorShares'

console.log('Initializing seeder ...')

function delay(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

async function seedAvsLoop() {
	while (true) {
		console.log('Seeding AVS & Operators ...')
		await seedAvs()
		await seedOperators()
		await seedAvsOperators()
		await seedStakers()
		await seedOperatorShares()

		await delay(120) // Wait for 2 minutes (120 seconds)
	}
}

async function seedPodsLoop() {
	while (true) {
		await delay(300)
		
		console.log('Seeding Pods & Validators')
		await seedPods()
		await seedValidatorsRestake()
		await seedValidators()
	}
}

seedAvsLoop()
seedPodsLoop()