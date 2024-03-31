import { PrismaClient } from '@prisma/client'

// Ensure the Prisma client is only instantiated once in your application
let prisma: PrismaClient

if (!(global as any).prisma) {
	;(global as any).prisma = new PrismaClient()
}

prisma = (global as any).prisma

export default prisma
