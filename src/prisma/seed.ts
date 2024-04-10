import 'dotenv/config'

import { seedPods } from '../scripts/seedPods'
import prisma from './prismaClient'

// Hardcoded base block for seeding
const baseBlock = 1159609n
// const baseBlock = 1309594n

async function main() {
	await seedPods(baseBlock)
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
