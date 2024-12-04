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
 * Authenticates the user via API Token and checks if they have hit their monthly limits.
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const authenticator = async (req: Request, res: Response, next: NextFunction) => {
	const apiToken = req.header('X-API-Token')

	if (!apiToken) {
		req.accessLevel = 0 // Req will be blocked (enabled in v2)
	}

	let accessLevel: number
	const updatedAt: number | undefined = authStore.get('updatedAt')

	if (!updatedAt && !authStore.get('isRefreshing')) refreshAuthStore()

	const accountRestricted = authStore.get(`apiToken:${apiToken}:accountRestricted`) || 0 // Benefit of doubt

	if (process.env.EE_AUTH_TOKEN === apiToken) {
		accessLevel = 999 // Admin access
	} else if (accountRestricted === 0) {
		accessLevel = authStore.get(`apiToken:${apiToken}:accessLevel`) ?? 997 // Fallback to db
	} else {
		accessLevel = -1 // Account restricted because monthly limit hit
	}

	if (accessLevel === 997) {
		// Db as last resort. API returns 0 in case token not found.
		const response = await fetch(`${process.env.SUPABASE_FETCH_ACCESS_LEVEL_URL}/${apiToken}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
				'Content-Type': 'application/json'
			}
		})
		accessLevel = response.ok ? Number((await response.json())?.data?.accessLevel) : 998 // Allow pass-through in case of db error
	}

	/*
	Note: Enable these checks in v2

	if (accessLevel === 0) {
		return res.status(401).json({
			error: `Missing or invalid API token. Please generate a valid token on https://dev.eigenexplorer.com and attach it with header 'X-API-Token'.`
		})
	}

	if (accessLevel === -1) {
		return res.status(401).json({
			error: 'You have reached your monthly limit. Please contact us to increase limits.'
		})
	}
	*/

	req.accessLevel = accessLevel

	next()
}

// --- Rate Limiting ---

/**
 * Rate limit settings for each Plan
 * Note: In v2, we remove the check for `accessLevel === 0` because unauthenticated users will not pass `authenticator`
 *
 */
const createRateLimiter = (accessLevel: number) => {
	// No rate limits for admin
	if (accessLevel === 999) return (_req: Request, _res: Response, next: NextFunction) => next()

	const requestsPerMin = PLANS[accessLevel].requestsPerMin

	const limiter = rateLimit({
		windowMs: 1 * 60 * 1000,
		max: requestsPerMin,
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: (req: Request): string =>
			accessLevel === 0 ? req.ip ?? 'unknown' : req.header('X-API-Token') || '',
		message: `You've reached the limit of ${requestsPerMin} requests per minute. ${
			accessLevel === 0
				? 'Sign up for a plan on https://dev.eigenexplorer.com for increased limits.'
				: 'Upgrade your plan for increased limits.'
		}`
	})

	// If request passes rate limiter, increment number of requests for the token in `requestStore`
	return (req: Request, res: Response, next: NextFunction) => {
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

		limiter(req, res, next)
	}
}

/**
 * Return a rate limiter basis the caller's access level
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
	return createRateLimiter(req.accessLevel || 0)(req, res, next)
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
