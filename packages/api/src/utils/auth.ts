import type { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import redis from './redisClient'
import { handleAndReturnErrorResponse } from '../schema/errors'

const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => {
		return req.header('X-API-Token') || ''
	}
})

/**
 * Implements rate limits for unauthenticated users
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export async function auth(
	req: Request,
	res: Response,
	next
) {
	const apiToken = req.header('X-API-Token')

	try { 
		if (apiToken) {
			const accessLevel = await redis.get(`apiToken:${apiToken}:accessLevel`)
			console.log("accessLevel: ", accessLevel)
			if (accessLevel === '1') return next() // Unlimited access
		}
		
		return rateLimiter(req, res, next)
	} catch (error) {
		return handleAndReturnErrorResponse(req, res, error)
	}
}
