import type { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { refreshAuthStore } from '../../utils/authMiddleware'
import { RequestHeadersSchema } from '../../schema/zod/schemas/auth'

/**
 * Protected route, refreshes the server's entire auth store. Called by Supabase edge fn signal-refresh.
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

		if (!apiToken || apiToken !== authToken) {
			throw new Error('Unauthorized access.')
		}

		const status = await refreshAuthStore()

		if (!status) {
			throw new Error('Refresh auth store failed.')
		}

		res.status(200).json({ message: 'Auth store refreshed.' })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Protected route, fetches the number of requests this month for a given uuid
 * Called by dev-portal dashboard page
 *
 * @param req
 * @param res
 * @returns
 */
export async function fetchRequests(req: Request, res: Response) {
	const headerCheck = RequestHeadersSchema.safeParse(req.headers)
	if (!headerCheck.success) {
		return handleAndReturnErrorResponse(req, res, headerCheck.error)
	}

	// TODO: uuid zod check

	try {
		const apiToken = headerCheck.data['X-API-Token']
		const authToken = process.env.EE_AUTH_TOKEN

		if (!apiToken || apiToken !== authToken) {
			throw new Error('Unauthorized access.')
		}

		const { uuid } = req.params

		const response = await fetch(`${process.env.SUPABASE_FETCH_REQUESTS_URL}?uuid=${uuid}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
				'Content-Type': 'application/json'
			}
		})

		const requests: number = (await response.json()).requests

		res.send({ requests })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
