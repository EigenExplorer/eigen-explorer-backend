import type { Request } from 'express'
import prisma from '../utils/prismaClient'
import redis from '../utils/redisClient'
import rateLimit from 'express-rate-limit'
import { handleAndReturnErrorResponse } from '../schema/errors'

/**
 * Checks for valid API token and sufficient credits
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export async function authenticateAndCheckCredits(req, res, next) {
	const token = req.header('X-API-Token')

	if (!token) {
		throw new Error('API token required')
	}

	try {
		const user = await prisma.user.findFirst({
			where: {
				apiTokens: {
					has: token
				}
			},
			select: {
				id: true,
				credits: true
			}
		})

		if (!user) {
			throw new Error('Invalid API token')
		}

		req.user = user

		let credits = Number(await redis.get(`user:${user.id}:credits`))
		
		if (credits === null) {
			credits = user.credits
			await redis.set(`user:${user.id}:credits`, credits)
		}

		if (credits <= 0) {
			throw new Error('Insufficient credits')
		}

		next()
	} catch (error) {
		return handleAndReturnErrorResponse(req, res, error)
	}
}

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
 * Handles credit deduction after request completion
 *
 * @param cost
 * @returns
 */
export function handleCreditDeduction(cost: number) {
	return async (req, res, next) => {
		const originalSend = res.send
		res.send = async function (body) {
			const userId = req.user.id
			const key = `user:${userId}:credits`

			try {
				const newCredits = await redis.decrby(key, cost)

				if (newCredits < 0) {
					redis.incrby(key, cost)
					throw new Error('Insufficient credits')
				}

				body.creditsRemaining = newCredits

				prisma.user
					.update({
						where: { id: userId },
						data: { credits: newCredits }
					})
					.catch((error) => console.log('Error updating Supabase:', error))

				originalSend.call(this, body)
			} catch (error) {
				return handleAndReturnErrorResponse(req, res, error)
			}
		}
		next()
	}
}
