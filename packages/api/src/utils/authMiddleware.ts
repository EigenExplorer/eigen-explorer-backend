import type { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import authStore from './authStore'

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
		case 2:
			return hobbyPlanLimiter(req, res, next)
		case 1:
			return adminLimiter(req, res, next)
		default:
			return unauthenticatedLimiter(req, res, next)
	}
}

async function refreshStore() {
	// TODO: Call dev-portal API and refresh authStore
	authStore.set('updatedAt', Date.now())
}
