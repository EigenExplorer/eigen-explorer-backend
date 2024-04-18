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

cron.schedule('*/2 * * * *', async () => {
	console.log('Seeding AVS & Operators ...')

	// await seedAvs()
	// await seedOperators()
	// await seedAvsOperators()
	// await seedStakers()
	// await seedOperatorShares()
})

cron.schedule('*/5 * * * *', async () => {
	console.log('Seeding Pods & Validators')

	// await seedPods()
	// await seedValidatorsRestake()
	// await seedValidators()
})
