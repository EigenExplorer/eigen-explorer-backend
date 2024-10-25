import type { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { refreshStore } from '../../utils/authMiddleware'
import { RequestHeadersSchema } from '../../schema/zod/schemas/auth'

/**
 * Refresh the server's entire auth store. Called by Supabase edge fn signal-refresh.
 * This function will fail if the caller does not use admin-level auth token
 *
 * @param req
 * @param res
 * @returns
 */
export async function signalRefreshStore(req: Request, res: Response) {
	const headerCheck = RequestHeadersSchema.safeParse(req.headers)
	if (!headerCheck.success) {
		return handleAndReturnErrorResponse(req, res, headerCheck.error)
	}

	try {
		const apiToken = headerCheck.data['X-API-Token']
		const authToken = process.env.EE_AUTH_TOKEN

		if (apiToken !== authToken) {
			throw new Error('Unauthorized access.')
		}

		const status = await refreshStore()

		if (!status) {
			throw new Error('Refresh auth store failed.')
		}

		res.status(200).json({ message: 'Auth store refreshed.' })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
