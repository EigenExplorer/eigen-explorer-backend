import 'dotenv/config'

import type { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import authStore from './authStore'

interface User {
	accessLevel: number
	apiTokens: string[]
}

/**
 * Rate limit settings for Free or no plan, access level = 0
 *
 */
const unauthenticatedLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => req.ip ?? 'unknown',
	message:
		"You've reached the limit of 30 requests per minute. Sign up for a plan on https://dev.eigenexplorer.com for increased limits."
})

/**
 * Rate limit settings for Hobby plan, access level = 1
 *
 */
const hobbyPlanLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 10_000,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => req.header('X-API-Token') || '',
	message:
		"You've reached the limit of 10k requests per minute. Upgrade your plan for increased limits."
})

/**
 * Rate limit settings for Admin, access level = 999
 *
 */
const adminLimiter = (_req: Request, _res: Response, next: NextFunction) => next() // No rate limit

/**
 * Generate a rate limiter basis the caller's access level
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
	const apiToken = req.header('X-API-Token')

	if (!apiToken) {
		req.accessLevel = 0
		return unauthenticatedLimiter(req, res, next)
	}

	const updatedAt: number | undefined = authStore.get('updatedAt')

	if (!updatedAt) {
		await refreshStore()
	}

	const accessLevel: number =
		process.env.EE_AUTH_TOKEN === apiToken
			? 999
			: authStore.get(`apiToken:${apiToken}:accessLevel`) ?? 0
	req.accessLevel = accessLevel // Access this in route functions to impose limits

	switch (accessLevel) {
		case 999:
			return adminLimiter(req, res, next)
		case 1:
			return hobbyPlanLimiter(req, res, next)
		default:
			return unauthenticatedLimiter(req, res, next)
	}
}

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
			for (const apiToken of apiTokens) {
				authStore.set(`apiToken:${apiToken}:accessLevel`, accessLevel)
			}
		}

		authStore.set('updatedAt', Date.now())
		return true
	} catch {
		return false
	}
}
