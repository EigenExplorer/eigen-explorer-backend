import type { Request } from 'express'
import rateLimit from 'express-rate-limit'

export const rateLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => {
		return req.ip ?? 'unknown'
	},
	message:
		"You've reached the limit of 30 requests per minute. Contact us for increased limits."
})
