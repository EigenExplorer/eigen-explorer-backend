import type { Prisma } from '@prisma/client'
import prisma from '../utils/prismaClient'
import redis from '../utils/redisClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'

let userData: Prisma.User[] = []

export async function fetchAndSyncUserData() {
	// Write all state changes to supabase
	const dbTransactions = await redis.lrange('dbTransactions', 0, -1)
	const parsedDbTransactions = dbTransactions.map((tx) => JSON.parse(tx))
	bulkUpdateDbTransactions(parsedDbTransactions, '[Auth] Updated user data')

	// Get latest state from supabase
	userData = await prisma.user.findMany({
		select: {
			apiTokens: true,
			credits: true
		}
	})

	// Write latest state to redis
	for (const user of userData) {
		for (const apiToken of user.apiTokens) {
			await redis.set(`apiToken:${apiToken}:credits`, String(user.credits))
		}
	}

	// Clear all db transactions
	await redis.del('dbTransactions')
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function addTransaction(transaction: any) {
	await redis.rpush('dbTransactions', JSON.stringify(transaction))
}

export function getUserData() {
	const data = userData
	return data
}
