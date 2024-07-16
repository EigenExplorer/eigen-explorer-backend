import * as express from 'express'

declare global {
	namespace Express {
		interface Request {
			accessLevel?: string
			credits?: string
			deducted?: boolean
		}
	}
}
