import 'dotenv/config'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

const JWT_SECRET = process.env.JWT_SECRET || ''

export function authenticateJWT(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const token = req.header('Authorization')?.split(' ')[1]

	if (!token) {
		return res
			.status(401)
			.json({ message: 'Access denied. No token provided.' })
	}

	try {
		jwt.verify(token, JWT_SECRET)
		req.route.protected = true // Enables route to skip API token middleware
		next()
	} catch (error) {
		res.status(400).json({ message: 'Invalid token.' })
	}
}
