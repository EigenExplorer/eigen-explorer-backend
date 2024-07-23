import { PrismaClient } from '@prisma/client'
import { PrismaClient as PrismaClientDashboard } from '../../../../client/clientDashboard'

// Ensure the Prisma client is only instantiated once in your application
let prisma: PrismaClient
let prismaDashboard: PrismaClientDashboard

export function getPrismaClient() {
	if (!prisma) {
		prisma = new PrismaClient({})
	}

	return prisma
}

export function getPrismaClientDashboard() {
	if (!prismaDashboard) {
		prismaDashboard = new PrismaClientDashboard({})
	}

	return prismaDashboard
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
