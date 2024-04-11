import { PrismaClient } from '@prisma/client'

// Ensure the Prisma client is only instantiated once in your application
let prisma: PrismaClient

export function getPrismaClient() {
	if (!prisma) {
		prisma = new PrismaClient()
	}

	return prisma
}

// ====================== DEPRECATED ======================
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
if (!(global as any).prisma) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	;(global as any).prisma = new PrismaClient()
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
prisma = (global as any).prisma

export default prisma
// ====================== DEPRECATED ======================