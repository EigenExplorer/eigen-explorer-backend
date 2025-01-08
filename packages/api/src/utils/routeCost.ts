import type { NextFunction, Request, Response } from 'express'

/**
 * Middleware function to be used when defining API routes and pointing them to their internal functions
 * If not set, cost calculator after route completion will consider cost as 1
 *
 * @param cost
 * @returns
 */
export function routeCost(cost: number) {
	return (req: Request, _res: Response, next: NextFunction) => {
		req.cost = cost
		next()
	}
}
