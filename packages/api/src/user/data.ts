import redis from '../utils/redisClient'
import type prisma from '../../../../client/clientDashboard/default'
import { getPrismaClientDashboard } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'

let userData: prisma.User[] = []
const prismaClientDashboard = getPrismaClientDashboard()

/**
 * Update db transactions collected by auth middleware + management routes & write latest supabase db state to redis
 *
 */
export async function fetchAndSyncUserData() {
	// Write all state changes to supabase
	const dbTransactionStrings = await redis.lrange('dbTransactions', 0, -1)

	if (dbTransactionStrings.length > 0) {
		// biome-ignore lint/security/noGlobalEval: <explanation>
		const dbTransactions = dbTransactionStrings.map((tx) => eval(tx))
		bulkUpdateDbTransactions(dbTransactions, '[Auth] Updated user data')
	}

	// Get latest state from supabase
	userData = await prismaClientDashboard.user.findMany({})

	// Write latest state to redis
	for (const user of userData) {
		if (user.apiTokens) {
			for (const apiToken of user.apiTokens) {
				await redis.set(`apiToken:${apiToken}:credits`, String(user.credits))
				await redis.set(
					`apiToken:${apiToken}:accessLevel`,
					String(user.accessLevel)
				)
			}
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
export async function addTransaction(transaction: string) {
	await redis.rpush('dbTransactions', transaction)
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
