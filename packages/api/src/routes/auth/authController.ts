import type { Request, Response } from 'express'
import authStore from '../../utils/authStore'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { UpdateCacheQuerySchema, RefreshCacheQuerySchema } from '../../schema/zod/schemas/auth'

/**
 * Receive a single record update to auth store (insert/update/delete record)
 *
 * @param req
 * @param res
 * @returns
 */
export async function postUpdateStore(req: Request, res: Response) {
	const queryCheck = UpdateCacheQuerySchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { action, apiToken, accessLevel } = queryCheck.data

		switch (action) {
			case 'write': {
				authStore.set(`apiToken:${apiToken}:accessLevel`, accessLevel)
				break
			}
			case 'delete': {
				authStore.del(`apiToken:${apiToken}:accessLevel`)
				break
			}
		}

		res.status(200).json({ message: 'Auth store updated.' })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Receive a full refresh of auth store
 *
 * @param req
 * @param res
 * @returns
 */
export async function postRefreshStore(req: Request, res: Response) {
	const bodyCheck = RefreshCacheQuerySchema.safeParse(req.body)
	if (!bodyCheck.success) {
		return handleAndReturnErrorResponse(req, res, bodyCheck.error)
	}

	try {
		const { data } = bodyCheck.data

		authStore.flushAll()

		for (const record of data) {
			authStore.set(`apiToken:${record.apiToken}:accessLevel`, record.accessLevel)
		}

		res.status(200).json({ message: `Auth store refreshed with ${data.length} records.` })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
