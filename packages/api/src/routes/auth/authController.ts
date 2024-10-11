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

/**
 * Post a full refresh of auth store
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

		let totalRecords = 0
		for (const record of data) {
			for (const apiToken of record.apiTokens) {
				authStore.set(`apiToken:${apiToken}:accessLevel`, record.accessLevel)
				totalRecords++
			}
		}

		res.status(200).json({ message: `Auth store refreshed with ${totalRecords} records.` })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
