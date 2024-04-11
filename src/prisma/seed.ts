import 'dotenv/config'

import prisma from './prismaClient'
import { seedValidators } from '../scripts/seedValidators'
import { seedValidatorsRestake } from '../scripts/seedValidatorsRestake'

// Hardcoded base block for seeding
const baseBlock = 1159609n

async function main() {
	// await seedPods(baseBlock)
	await seedValidatorsRestake(baseBlock)
	await seedValidators(baseBlock)
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
