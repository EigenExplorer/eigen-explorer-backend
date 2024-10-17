import type { Request } from 'express'
import rateLimit from 'express-rate-limit'
import { getNetwork } from '../viem/viemClient'

export const rateLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: getNetwork().testnet ? 30 : 9999,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request): string => {
		return req.ip ?? 'unknown'
	},
	message: "You've reached the limit of 30 requests per minute. Contact us for increased limits."
})
