import 'dotenv/config'

import type { NextFunction, Request, Response } from 'express'
import { authStore, requestsStore } from './authCache'
import { triggerUserRequestsSync } from './requestsUpdateManager'
import { constructEfUrl } from './edgeFunctions'
import { EigenExplorerApiError, handleAndReturnErrorResponse } from '../schema/errors'
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
		name: 'Unauthenticated'
	},
	1: {
		name: 'Hobby',
		requestsPerMin: 100,
		requestsPerMonth: 10_000
	},
	2: {
		name: 'Pro',
		requestsPerMin: 1_000,
		requestsPerMonth: 100_000
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
 * 0 -> Unauthenticated (req blocked)
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
	const edgeFunctionIndex = 2
	let accessLevel: number

	// Find access level & set rate limiting key
	if (!apiToken) {
		accessLevel = 0
	} else {
		req.key = apiToken
		const updatedAt: number | undefined = authStore.get('updatedAt')

		if (!updatedAt && !authStore.get('isRefreshing')) refreshAuthStore()
		const accountRestricted = authStore.get(`apiToken:${apiToken}:accountRestricted`) || 0 // Benefit of the doubt

		if (accountRestricted === 0) {
			accessLevel = authStore.get(`apiToken:${apiToken}:accessLevel`) ?? 998 // Temp state, fallback to DB
		} else {
			accessLevel = -1
		}
	}

	if (accessLevel === 998) {
		const functionUrl = constructEfUrl(edgeFunctionIndex)

		if (!functionUrl) {
			throw new Error('Invalid function selector')
		}

		const response = await fetch(`${functionUrl}/${apiToken}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
				'Content-Type': 'application/json'
			}
		})
		const payload = await response.json()
		accessLevel = response.ok ? Number(payload?.data?.accessLevel) : 1 // Benefit of the doubt
	}

	// Impose limits
	if (accessLevel === 0) {
		const err = new EigenExplorerApiError({
			code: 'unauthorized',
			message: `Missing or invalid API token. Please generate a valid token on https://developer.eigenexplorer.com and attach it with header 'X-API-Token'.`
		})

		return handleAndReturnErrorResponse(req, res, err)
	}

	if (accessLevel === -1) {
		const err = new EigenExplorerApiError({
			code: 'unauthorized',
			message: 'You have reached your monthly limit. Please contact us to increase limits.'
		})

		return handleAndReturnErrorResponse(req, res, err)
	}

	req.accessLevel = accessLevel
	next()
}

// --- Rate Limiting ---

/**
 * Create rate limiters for plans where req/min is applicable
 *
 */

const rateLimiters: Record<number, ReturnType<typeof rateLimit>> = {}

for (const [level, plan] of Object.entries(PLANS)) {
	const accessLevel = Number(level)

	if (plan.requestsPerMin) {
		rateLimiters[accessLevel] = rateLimit({
			windowMs: 1 * 60 * 1000,
			max: plan.requestsPerMin,
			standardHeaders: true,
			legacyHeaders: false,
			keyGenerator: (req: Request): string => req.key,
			message: `You've reached the limit of ${plan.requestsPerMin} requests per minute. Upgrade your plan for increased limits.`
		})
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
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
	const accessLevel = req.accessLevel

	// Skip rate limiting if req/min not applicable to plan
	if (!PLANS[accessLevel].requestsPerMin) {
		return next()
	}

	// Apply rate limiting
	const limiter = rateLimiters[accessLevel]
	return limiter(req, res, next)
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
		const edgeFunctionIndex = 1

		while (true) {
			const functionUrl = constructEfUrl(edgeFunctionIndex)

			if (!functionUrl) {
				throw new Error('Invalid function selector')
			}

			const response = await fetch(`${functionUrl}?skip=${skip}&take=${take}`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
					'Content-Type': 'application/json'
				}
			})

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

			if (users.length < take) break

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
