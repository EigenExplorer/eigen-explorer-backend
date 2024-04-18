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
import { getPrismaClient } from './prisma/prismaClient'

const prismaClient = getPrismaClient()

// async function main() {
// await seedAvs()
// await seedOperators()
// await seedAvsOperators()
// await seedPods()
// await seedValidatorsRestake()
// await seedValidators()
// await seedStakers()
// await seedOperatorShares()
// }

console.log('Initializing seeder ...')

cron.schedule('*/2 * * * *', () => {
	console.log('This task runs every 2 minutes')
})

cron.schedule('*/5 * * * *', () => {
	console.log('This task runs every 5 minutes')
})

cron.schedule('*/10 * * * *', () => {
	console.log('This task runs every 10 minutes')
})

// main()
// 	.then(async () => {
// 		await prisma.$disconnect()
// 	})
// 	.catch(async (e) => {
// 		console.error(e)
// 		await prisma.$disconnect()
// 		process.exit(1)
// 	})
