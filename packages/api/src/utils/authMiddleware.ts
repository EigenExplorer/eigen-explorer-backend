import 'dotenv/config'

import type { NextFunction, Request, Response } from 'express'
import { authStore, requestsStore } from './authCache'
import rateLimit from 'express-rate-limit'

// --- Types ---

export interface User {
	id: string
	accessLevel: number
	apiTokens: string[]
	requests: number
}

interface Plan {
	name: string
	requestsPerMin?: number
	requestsPerMonth?: number
}

// --- Config for plans we offer ---

const PLANS: Record<number, Plan> = {
	0: {
		name: 'Unauthenticated',
		requestsPerMin: 30, // Remove in v2
		requestsPerMonth: 1_000 // Remove in v2
	},
	1: {
		name: 'Free',
		requestsPerMin: 30,
		requestsPerMonth: 1_000
	},
	2: {
		name: 'Basic',
		requestsPerMin: 1_000,
		requestsPerMonth: 10_000
	},
	999: {
		name: 'Admin'
	}
}

// --- Authentication ---

/**
 * Authenticates the user via API Token and handles any limit imposition basis access level
 * Designed for speed over strictness, always giving user benefit of the doubt
 *
 * -1 -> Account restricted (monthly limit hit)
 * 0 -> No API token (req will be blocked in v2)
 * 1 -> Hobby plan or server/db error
 * 2 -> Basic plan
 * 998 -> Fallback to db to in case auth store is updating (temp state, gets re-assigned to another value)
 * 999 -> Admin access
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const authenticator = async (req: Request, res: Response, next: NextFunction) => {
	const apiToken = req.header('X-API-Token')
	let accessLevel: number

	// Find access level
	if (!apiToken) {
		accessLevel = 0
	} else {
		const updatedAt: number | undefined = authStore.get('updatedAt')

		if (!updatedAt && !authStore.get('isRefreshing')) refreshAuthStore()
		const accountRestricted = authStore.get(`apiToken:${apiToken}:accountRestricted`) || 0 // Benefit of the doubt

		if (process.env.EE_AUTH_TOKEN === apiToken) {
			accessLevel = 999
		} else if (accountRestricted === 0) {
			accessLevel = authStore.get(`apiToken:${apiToken}:accessLevel`) ?? 998
		} else {
			accessLevel = -1
		}
	}

	// Handle limiting basis access level
	if (accessLevel === 998) {
		const response = await fetch(`${process.env.SUPABASE_FETCH_ACCESS_LEVEL_URL}/${apiToken}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
				'Content-Type': 'application/json'
			}
		})
		const payload = await response.json()
		accessLevel = response.ok ? Number(payload?.data?.accessLevel) : 1 // Benefit of the doubt
	}

	// --- LIMITING TO BE ACTIVATED IN V2 ---
	if (accessLevel === 0) accessLevel = 1
	if (accessLevel === -1) accessLevel = 1

	/*
	if (accessLevel === 0) {
		return res.status(401).json({
			error: `Missing or invalid API token. Please generate a valid token on https://developer.eigenexplorer.com and attach it with header 'X-API-Token'.`
		})
	}

	if (accessLevel === -1) {
		return res.status(401).json({
			error: 'You have reached your monthly limit. Please contact us to increase limits.'
		})
	}
	*/
	// --- LIMITING TO BE ACTIVATED IN V2 ---

	req.accessLevel = accessLevel
	next()
}

// --- Rate Limiting ---

/**
 * Create rate limiters for each Plan
 * Note: In v2, we remove the check for `accessLevel === 0` because unauthenticated users would not have passed `authenticator`
 *
 */

const rateLimiters: Record<number, ReturnType<typeof rateLimit>> = {}

for (const [level, plan] of Object.entries(PLANS)) {
	const accessLevel = Number(level)

	if (accessLevel === 999) continue

	rateLimiters[accessLevel] = rateLimit({
		windowMs: 1 * 60 * 1000,
		max: plan.requestsPerMin,
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: (req: Request): string =>
			accessLevel === 0 ? req.ip ?? 'unknown' : req.header('X-API-Token') || '',
		message: `You've reached the limit of ${plan.requestsPerMin} requests per minute. ${
			accessLevel === 0
				? 'Sign up for a plan on https://developer.eigenexplorer.com for increased limits.'
				: 'Upgrade your plan for increased limits.'
		}`
	})
}

/**
 * Return a rate limiter basis the caller's access level
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
	const accessLevel = req.accessLevel || 0

	// --- LIMITING TO BE ACTIVATED IN V2 ---
	if (accessLevel >= 0) {
		return next()
	}

	/*
	// Apply rate limiting
	const limiter = rateLimiters[accessLevel]

	// Increment `requestsStore` for successful requests
	const originalEnd = res.end

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	res.end = function (chunk?: any, encoding?: any, cb?: any) {
		try {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				const apiToken = req.header('X-API-Token')
				if (apiToken) {
					const key = `apiToken:${apiToken}:newRequests`
					const currentCalls: number = requestsStore.get(key) || 0
					requestsStore.set(key, currentCalls + 1)
				}
			}
		} catch {}

		res.end = originalEnd
		return originalEnd.call(this, chunk, encoding, cb)
	}
	return limiter(req, res, next)
	*/
	// --- LIMITING TO BE ACTIVATED IN V2 ---
}

// --- Auth store management ---

/**
 * Fetch all user auth data from Supabase edge function and refresh auth store.
 *
 */
export async function refreshAuthStore() {
	if (authStore.get('isRefreshing')) {
		return false
	}

	try {
		authStore.flushAll()
		authStore.set('isRefreshing', true)

		let skip = 0
		const take = 10_000

		while (true) {
			const response = await fetch(
				`${process.env.SUPABASE_FETCH_ALL_USERS_URL}?skip=${skip}&take=${take}`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
						'Content-Type': 'application/json'
					}
				}
			)

			if (!response.ok) {
				throw new Error()
			}

			const users = (await response.json()).data as User[]

			if (users.length === 0) break

			for (const user of users) {
				const accessLevel = user.accessLevel || 0
				const apiTokens = user.apiTokens || []
				const requests = user.requests || 0

				for (const apiToken of apiTokens) {
					authStore.set(`apiToken:${apiToken}:accessLevel`, accessLevel)
					authStore.set(
						`apiToken:${apiToken}:accountRestricted`,
						requests <= (PLANS[accessLevel].requestsPerMonth ?? Number.POSITIVE_INFINITY) ? 0 : 1
					)
				}
			}
			skip += take
		}

		authStore.set('updatedAt', Date.now())
		return true
	} catch {
		return false
	} finally {
		authStore.set('isRefreshing', false)
	}
}
