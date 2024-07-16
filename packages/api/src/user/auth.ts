import type { Request, Response } from 'express'
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
export async function authenticateAndCheckCredits(
	req: Request,
	res: Response,
	next
) {
	const apiToken = req.header('X-API-Token')

	if (!apiToken) {
		throw new Error('API token required')
	}

	try {
		let credits = await redis.get(`apiToken:${apiToken}:credits`)
		let accessLevel = await redis.get(`apiToken:${apiToken}:accessLevel`)

		if (credits === null || accessLevel === null) {
			// Fallback to supabase data
			const users = getUserData()
			const user = users.find((user) => user.apiTokens?.includes(apiToken))

			if (!user) {
				throw new Error('Invalid API token')
			}

			credits = String(user.credits)
			accessLevel = String(user.accessLevel)
		}

		if (Number(credits) <= 0) {
			throw new Error('Insufficient credits')
		}

		req.credits = credits
		req.accessLevel = accessLevel
		req.deducted = false
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
	return async (req: Request, res: Response, next) => {
		if (req.accessLevel === '0') {
			return next()
		}
		const apiToken = req.header('X-API-Token') || ''
		const originalSend = res.send
		const updatedCredits = Number(req.credits) - cost

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		res.send = (body: any) => {
			if (req.deducted) {
				return originalSend.call(res, body)
			}

			try {
				if (updatedCredits < 0) {
					throw new Error('Insufficient credits')
				}

				const users = getUserData()
				const user = users.find((user) => user.apiTokens?.includes(apiToken))

				if (user) {
					addTransaction(
						`prismaClientDashboard.user.update({
							where: {
								id: "${user.id}"
							},
							data: {
								credits: {
									decrement: ${cost}
								}
							}
						})`
					)
				}

				req.deducted = true
				return originalSend.call(res, body)
			} catch (error) {
				return handleAndReturnErrorResponse(req, res, error)
			}
		}
		next()
	}
}
