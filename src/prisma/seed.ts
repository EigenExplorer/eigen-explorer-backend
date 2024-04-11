import 'dotenv/config'

import prisma from './prismaClient'
import { seedValidators } from '../scripts/seedValidators'
import { seedAvs } from '../scripts/seedAvs'
import { seedAvsOperators } from '../scripts/seedAvsOperators'
import { seedOperators } from '../scripts/seedOperators'
import { seedPods } from '../scripts/seedPods'
import { seedValidatorsRestake } from '../scripts/seedValidatorsRestake'
import { seedStakers } from '../scripts/seedStakers'

async function main() {
	await seedAvs()
	await seedOperators()
	await seedAvsOperators()
	await seedPods()
	await seedValidatorsRestake()
	await seedValidators()
	await seedStakers()
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
