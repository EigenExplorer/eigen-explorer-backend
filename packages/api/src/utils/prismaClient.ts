import { PrismaClient } from '@prisma/client'

// Ensure the Prisma client is only instantiated once in your application
export let prismaClient: PrismaClient

export function getPrismaClient() {
	if (!prismaClient) {
		prismaClient = new PrismaClient({})
	}

	return prismaClient
}

// Initialize the Prisma client
getPrismaClient()
