import 'dotenv/config'

import type { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import authStore from './authStore'

// --- Types ---

interface User {
	accessLevel: number
	apiTokens: string[]
	requests: number
}

interface Plan {
	name: string
	accessLevel: number
	requestsPerMin?: number
	requestsPerMonth?: number
}

// --- Config for plans we offer ---

const PLANS: Record<number, Plan> = {
	0: {
		name: 'Free',
		accessLevel: 0,
		requestsPerMin: 30,
		requestsPerMonth: 1_000
	},
	1: {
		name: 'Basic',
		accessLevel: 1,
		requestsPerMin: 1_000,
		requestsPerMonth: 10_000
	},
	999: {
		name: 'Admin',
		accessLevel: 999
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
		req.accessLevel = 0
	}

	const updatedAt: number | undefined = authStore.get('updatedAt')

	if (!updatedAt) {
		await refreshStore()
	}

	const accessLevel: number =
		process.env.EE_AUTH_TOKEN === apiToken
			? 999
			: authStore.get(`apiToken:${apiToken}:accountRestricted`) === 0
			? authStore.get(`apiToken:${apiToken}:accessLevel`) ?? 0
			: -1

	/*
	Note: Enable these checks in v2

	if (accessLevel === -1) {
		return res.status(401).json({
			error: 'You have reached your monthly limit. Please contact us to increase limits.'
		})
	}

	if (accessLevel === 0) {
		return res.status(401).json({
			error: `Missing or invalid API token. Please generate a valid token on https://dev.eigenexplorer.com and attach it with header 'X-API-Token'.`
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
const createRateLimiter = (plan: Plan) => {
	// No rate limits for admin
	if (plan.accessLevel === 999) return (_req: Request, _res: Response, next: NextFunction) => next()

	const limiter = rateLimit({
		windowMs: 1 * 60 * 1000,
		max: plan.requestsPerMin,
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: (req: Request): string =>
			plan.accessLevel === 0 ? req.ip ?? 'unknown' : req.header('X-API-Token') || '',
		message: `You've reached the limit of ${plan.requestsPerMin} requests per minute. ${
			plan.accessLevel === 0
				? 'Sign up for a plan on https://dev.eigenexplorer.com for increased limits.'
				: 'Upgrade your plan for increased limits.'
		}`
	})

	// If request passes rate limiter, increment counter
	return (req: Request, res: Response, next: NextFunction) => {
		const originalEnd = res.end

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		res.end = function (chunk?: any, encoding?: any, cb?: any) {
			try {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					const apiToken = req.header('X-API-Token')
					if (apiToken) {
						const currentCalls: number = authStore.get(`apiToken:${apiToken}:newRequests`) || 0
						authStore.set(`apiToken:${apiToken}:newRequests`, currentCalls + 1)
					}
				}
			} catch (error) {
				console.error('Error incrementing request counter:', error)
			}

			res.end = originalEnd
			return originalEnd.call(this, chunk, encoding, cb)
		}

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		limiter(req, res, next as any)
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
	const plan = PLANS[req.accessLevel || 0]
	return createRateLimiter(plan)(req, res, next)
}

// --- Auth store management ---

/**
 * Fetch all user auth data from Supabase edge function and refresh auth store.
 *
 */
export async function refreshStore() {
	try {
		const response = await fetch(`${process.env.SUPABASE_FETCH_ALL_USERS_URL}`, {
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

		authStore.flushAll()

		for (const user of users) {
			const accessLevel = user.accessLevel || 0
			const apiTokens = user.apiTokens ?? []
			const requests = user.requests ?? 0
			for (const apiToken of apiTokens) {
				authStore.set(`apiToken:${apiToken}:accessLevel`, accessLevel)
				authStore.set(
					`apiToken:${apiToken}:accountRestricted`,
					requests <= (PLANS[accessLevel].requestsPerMonth ?? Number.POSITIVE_INFINITY) ? 0 : 1
				)
			}
		}

		authStore.set('updatedAt', Date.now())
		return true
	} catch {
		return false
	}
}
