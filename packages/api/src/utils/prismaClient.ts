import { PrismaClient } from '@prisma/client'
import { PrismaClient as PrismaClientDashboard } from '../../../../client/clientDashboard'

// Ensure the Prisma client is only instantiated once in your application
export let prisma: PrismaClient
export let prismaDashboard: PrismaClientDashboard

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
