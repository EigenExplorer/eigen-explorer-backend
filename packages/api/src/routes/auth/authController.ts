import type { Request, Response } from 'express'
import authStore from '../../utils/authStore'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { UpdateCacheQuerySchema, RefreshCacheQuerySchema } from '../../schema/zod/schemas/auth'

/**
 * Post a single record update to auth store (insert/update/delete record)
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
		const { type, record, old_record } = queryCheck.data

		switch (type) {
			case 'INSERT':
			case 'UPDATE': {
				if (record) {
					for (const apiToken of record.apiTokens) {
						authStore.set(`apiToken:${apiToken}:accessLevel`, record.accessLevel)
					}
				}
				break
			}
			case 'DELETE': {
				if (old_record) {
					for (const apiToken of old_record.apiTokens) {
						authStore.del(`apiToken:${apiToken}:accessLevel`)
					}
				}
			}
		}

		res.status(200).json({ message: 'Auth store updated.' })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
