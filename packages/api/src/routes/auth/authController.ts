import prisma from '../../utils/prismaClient'
import redis from '../../utils/redisClient'
import crypto from 'node:crypto'
import type { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { addTransaction } from '../../user/data'
import {
	GenerateTokenSchema,
	RemoveTokenSchema,
	UpdateCreditsSchema
} from '../../schema/zod/schemas/auth'

/**
 * Create new API token for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function generateToken(req: Request, res: Response) {
	const queryCheck = GenerateTokenSchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { credits, id } = req.body
		const newToken = crypto.randomBytes(32).toString('hex')
		const maxApiTokens = 15

		const user = await prisma.user.findUnique({
			where: { id },
			select: { apiTokens: true, credits: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		if (user.apiTokens.length >= maxApiTokens) {
			throw new Error('Reached max number of API tokens for this account')
		}

		const updatedTokens = [...user.apiTokens, newToken]
		const updatedCredits = user.credits + Number(credits)

		addTransaction(
			prisma.user.update({
				where: { id },
				data: {
					apiTokens: updatedTokens,
					credits: updatedCredits
				}
			})
		)

		res.send({ message: 'New API token created', data: newToken })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Remove an existing API token for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function removeToken(req: Request, res: Response) {
	const queryCheck = RemoveTokenSchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { id, token: tokenToRemove } = req.body
		const user = await prisma.user.findUnique({
			where: { id },
			select: { apiTokens: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		if (!user.apiTokens.has(tokenToRemove)) {
			throw new Error('Invalid token')
		}

		const updatedTokens = user.apiTokens.filter(
			(token) => token !== tokenToRemove
		)

		addTransaction(
			prisma.user.update({
				where: { id },
				data: {
					apiTokens: updatedTokens
				}
			})
		)

		res.send({ message: 'API token revoked', data: tokenToRemove })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Add credits for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function addCredits(req: Request, res: Response) {
	const queryCheck = UpdateCreditsSchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { id, credits } = req.body
		const user = await prisma.user.findUnique({
			where: { id },
			select: { apiTokens: true, credits: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		const updatedCredits =
			user.credits >= 0 ? user.credits + Number(credits) : Number(credits)

		addTransaction(
			prisma.user.update({
				where: { id },
				data: {
					credits: updatedCredits
				}
			})
		)

		res.send({ message: 'Credits added', totalCredits: updatedCredits })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Check remaining credits for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function checkCredits(req: Request, res: Response) {
	try {
		const apiToken = req.header('X-API-Token')
		const credits = await redis.get(`apiToken:${apiToken}:credits`)
		const totalCredits = Number(credits) >= 0 ? Number(credits) : 0

		res.send({ totalCredits })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Deduct credits for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function deductCredits(req: Request, res: Response) {
	const queryCheck = UpdateCreditsSchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { id, credits } = req.body
		const user = await prisma.user.findUnique({
			where: { id },
			select: { apiTokens: true, credits: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		const updatedCredits =
			user.credits - Number(credits) >= 0 ? user.credits - Number(credits) : 0

		addTransaction(
			prisma.user.update({
				where: { id },
				data: {
					credits: updatedCredits
				}
			})
		)

		res.send({ message: 'Credits deducted', totalCredits: updatedCredits })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
