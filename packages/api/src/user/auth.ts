import type { Request } from 'express'
import prisma from '../utils/prismaClient'
import redis from '../utils/redisClient'
import rateLimit from 'express-rate-limit'
import { handleAndReturnErrorResponse } from '../schema/errors'
import { addTransaction, getUserData } from '../user/data'

/**
 * Implements rate limits
 *
 */
export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => {
		return req.header('X-API-Token') || ''
	}
})

/**
 * Checks for valid API token and sufficient credits
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export async function authenticateAndCheckCredits(req, res, next) {
	if(req.protected) {
		return next() // Skip if route has JWT protection
	}

	const apiToken = req.header('X-API-Token')

	if (!apiToken) {
		throw new Error('API token required')
	}

	try {
		let credits = await redis.get(`apiToken:${apiToken}:credits`)

		if (credits === null) { // Fallback to supabase data
			const users = getUserData()
			const user = users.find(user => user.apiTokens.includes(apiToken))

			if (!user) {
				throw new Error('Invalid API token')
			}

			if (Number(credits) <= 0) {
				throw new Error('Insufficient credits')
			}

			credits = String(user.credits)
		}

		req.credits = credits
		next()
	} catch (error) {
		return handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Handles credit deduction after request completion
 *
 * @param cost
 * @returns
 */
export function handleCreditDeduction(cost: number) {
	return async (req, res, next) => {
		if(req.protected) {
			return next() // Skip if route has JWT protection
		}

		const apiToken = req.header('X-API-Token')
		const originalSend = res.send
		const updatedCredits = Number(req.credits) - cost

		res.send = async function (body) {
			try {
				if (updatedCredits < 0) {
					throw new Error('Insufficient credits')
				}

				addTransaction(prisma.user.update({
					where: {
						apiTokens: {
							has: apiToken
						}
					},
					data: {
						credits: {
							decrement: cost 
						}
					}
				}))

				originalSend.call(this, body)
			} catch (error) {
				return handleAndReturnErrorResponse(req, res, error)
			}
		}
		next()
	}
}
