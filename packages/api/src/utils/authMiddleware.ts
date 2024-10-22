import 'dotenv/config'

import type { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import authStore from './authStore'

interface User {
	accessLevel: number
	apiTokens: string[]
}

// Rate limiters for different access levels
const unauthenticatedLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => req.ip ?? 'unknown',
	message:
		"You've reached the limit of 30 requests per minute. Sign up for a plan on https://dev.eigenexplorer.com for increased limits."
})

const hobbyPlanLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 10_000,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => req.header('X-API-Token') || '',
	message:
		"You've reached the limit of 10k requests per minute. Upgrade your plan for increased limits."
})

// No rate limit for admin
const adminLimiter = (_req: Request, _res: Response, next: NextFunction) => next()

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

	const accessLevel: number = authStore.get(`apiToken:${apiToken}:accessLevel`) ?? 0
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

export async function refreshStore() {
	// Fetch user auth data from Supabase edge function
	try {
		const response = await fetch(`${process.env.FETCH_ALL_USERS_URL}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${process.env.SUPABASE_JWT_BEARER}`,
				'Content-Type': 'application/json'
			}
		})

		if (!response.ok) {
			console.log('response: ', response)
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const users = (await response.json()).data as User[]

		// Refresh auth store
		authStore.flushAll()

		for (const user of users) {
			const accessLevel = user.accessLevel
			for (const apiToken of user.apiTokens) {
				authStore.set(`apiToken:${apiToken}:accessLevel`, accessLevel)
			}
		}

		authStore.set('updatedAt', Date.now())
	} catch {}
}
