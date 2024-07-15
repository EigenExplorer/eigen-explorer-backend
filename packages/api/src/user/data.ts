import type { Prisma } from '@prisma/client'
import prisma from '../utils/prismaClient'
import redis from '../utils/redisClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'

let userData: Prisma.User[] = []

/**
 * Update db transactions collected by auth middleware + management routes & write latest supabase db state to redis
 * 
 */
export async function fetchAndSyncUserData() {
	// Write all state changes to supabase
	const dbTransactionsJson = await redis.lrange('dbTransactions', 0, -1)

	if (dbTransactionsJson.length > 0) {
		const dbTransactions = dbTransactionsJson.map((tx) => JSON.parse(tx))
		bulkUpdateDbTransactions(dbTransactions, '[Auth] Updated user data')
	}

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

/**
 * Add a prisma transaction to the queue via redis
 * 
 * @param transaction 
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function addTransaction(transaction: any) {
	await redis.rpush('dbTransactions', JSON.stringify(transaction))
}

/**
 * Access latest supabase db state
 * 
 * @returns 
 */
export function getUserData() {
	const data = userData
	return data
}
