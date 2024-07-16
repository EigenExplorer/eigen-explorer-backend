import type { Request, Response } from 'express'
import redis from '../../utils/redisClient'
import crypto from 'node:crypto'
import { getPrismaClientDashboard } from '../../utils/prismaClient'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { addTransaction } from '../../user/data'
import {
	GenerateTokenSchema,
	RemoveTokenSchema,
	UpdateCreditsSchema
} from '../../schema/zod/schemas/auth'

const prismaClientDashboard = getPrismaClientDashboard()

/**
 * Create new API token for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function generateToken(req: Request, res: Response) {
	if (req.accessLevel !== '0') {
		throw new Error('Access denied')
	}

	const queryCheck = GenerateTokenSchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { credits, id } = req.body
		const newToken = crypto.randomBytes(32).toString('hex')
		const maxApiTokens = 15

		const user = await prismaClientDashboard.user.findUnique({
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
		const updatedCredits =
			user.credits && user.credits >= 0
				? user.credits + Number(credits)
				: Number(credits)

		await addTransaction(
			`prismaClientDashboard.user.update({
				where: { id: "${id}" },
				data: {
				apiTokens: ${JSON.stringify(updatedTokens)},
				credits: ${updatedCredits}
				}
			})`
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
		const user = await prismaClientDashboard.user.findUnique({
			where: { id },
			select: { apiTokens: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		if (!user.apiTokens.includes(tokenToRemove)) {
			throw new Error('Invalid token')
		}

		const updatedTokens = user.apiTokens.filter(
			(token) => token !== tokenToRemove
		)

		addTransaction(
			`prismaClientDashboard.user.update({
				where: { id: "${id}" },
				data: {
					apiTokens: ${updatedTokens}
				}
			})`
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
		const user = await prismaClientDashboard.user.findUnique({
			where: { id },
			select: { apiTokens: true, credits: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		const updatedCredits =
			user.credits && user.credits >= 0
				? user.credits + Number(credits)
				: Number(credits)

		addTransaction(
			`prismaClientDashboard.user.update({
				where: { id: "${id}" },
				data: {
					credits: ${updatedCredits}
				}
			})`
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
 * Deduct credits for an existing user. Only accessible by admin.
 *
 * @param req
 * @param res
 * @returns
 */
export async function deductCredits(req: Request, res: Response) {
	if (req.accessLevel !== '0') {
		throw new Error('Access denied')
	}

	const queryCheck = UpdateCreditsSchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { id, credits } = req.body
		const user = await prismaClientDashboard.user.findUnique({
			where: { id },
			select: { apiTokens: true, credits: true }
		})

		if (!user) {
			throw new Error('Invalid id, user not found')
		}

		const updatedCredits =
			user.credits && user.credits >= 0
				? user.credits + Number(credits)
				: Number(credits)

		addTransaction(
			`prismaClientDashboard.user.update({
				where: { id: "${id}" },
				data: {
					credits: ${updatedCredits}
				}
			})`
		)

		res.send({ message: 'Credits deducted', totalCredits: updatedCredits })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// TODO: Update access level
