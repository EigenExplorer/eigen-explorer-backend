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

async function main() {
	await seedAvs()
	await seedOperators()
	await seedAvsOperators()
	await seedPods()
	await seedValidatorsRestake()
	await seedValidators()
	await seedStakers()
	await seedOperatorShares()
}

console.log('Initializing seeder ...')

main()