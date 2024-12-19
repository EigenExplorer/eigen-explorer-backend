import * as express from 'express'

declare global {
	namespace Express {
		interface Request {
			accessLevel: number
			key: string
		}
	}
}
