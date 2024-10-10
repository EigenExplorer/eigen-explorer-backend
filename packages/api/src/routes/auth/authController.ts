import type { Request, Response } from 'express'
import crypto from 'node:crypto'
import redis from '../../utils/redisClient'
import { getPrismaClientDashboard } from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import {
GenerateTokenSchema,
RevokeTokenSchema
} from '../../schema/zod/schemas/auth'

const prismaClientDashboard = getPrismaClientDashboard()

/**
  * Function for /auth/create-user 
  * Creates a new user along with one API token
  *
  * @param req
  * @param res
  * @returns
  */
export async function createUser(req: Request, res: Response) {
	try {
		const newToken = crypto.randomBytes(32).toString('hex')

		const newUser = await prismaClientDashboard.user.create({
			data: {
				apiTokens: [newToken],
				credits: 0,
				accessLevel: 1
			}
		})

		await redis.set(`apiToken:${newToken}:accessLevel`, 1)

		res.send({ data: { id: newUser.id, apiToken: newToken } })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
  * Function for /auth/generate-token 
  * Creates one new API token for an existing user
  *
  * @param req
  * @param res
  * @returns
  */
export async function generateToken(req: Request, res: Response) {
	const queryCheck = GenerateTokenSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { id } = queryCheck.data
		const newToken = crypto.randomBytes(32).toString('hex')
		const maxApiTokens = 15

		const user = await prismaClientDashboard.user.findUnique({
			where: { id },
			select: { apiTokens: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		if (user.apiTokens.length >= maxApiTokens) {
			throw new Error('Reached max number of API tokens for this account')
		}

		const updatedTokens = [...user.apiTokens, newToken]

		await prismaClientDashboard.user.update({
			where: { id },
			data: {
				apiTokens: updatedTokens,
			}
		})

		await redis.set(`apiToken:${newToken}:accessLevel`, 1)

		res.send({ data: { id, apiToken: newToken } })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for /auth/revoke-token 
 * Revokes an existing API token for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function revokeToken(req: Request, res: Response) {
	const queryCheck = RevokeTokenSchema.safeParse(req.query)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { id, token: tokenToRemove } = queryCheck.data
		const user = await prismaClientDashboard.user.findUnique({
			where: { id },
			select: { apiTokens: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		if (!user.apiTokens.includes(tokenToRemove)) {
			throw new Error('Invalid API token')
		}

		const updatedTokens = user.apiTokens.filter(
			(token) => token !== tokenToRemove
		)

		await prismaClientDashboard.user.update({
			where: { id },
			data: {
				apiTokens: updatedTokens
			}
		})

		await redis.del(`apiToken:${tokenToRemove}:accessLevel`)

		res.send({ data: { id, apiToken: tokenToRemove } }) 
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
