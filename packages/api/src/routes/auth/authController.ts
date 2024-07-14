import prisma from '../../utils/prismaClient'
import redis from '../../utils/redisClient'
import crypto from 'node:crypto'
import type { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import {
	GenerateTokenSchema,
	RemoveTokenSchema,
	UpdateCreditsSchema
} from '../../schema/zod/schemas/auth'

/**
 * Create new API token for an existing user or create new user & new API token
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
		const user = await prisma.user.findUnique({
			where: { id: Number(id) }
		})

		if (!user) {
			const newUser = await prisma.user.create({
				data: {
					apiTokens: [newToken],
					credits: credits
				}
			})
			await redis.set(`user:${newUser.id}:credits`, newUser.credits)
			res.send(newUser)
		} else {
			const updatedTokens = [...user.apiTokens, newToken]
			const updatedCredits = user.credits + credits
			const updatedUser = await prisma.user.update({
				where: { id: Number(id) },
				data: {
					apiTokens: updatedTokens,
					credits: updatedCredits
				}
			})
			await redis.set(`user:${updatedUser.id}:credits`, updatedUser.credits)
			res.send(updatedUser)
		}
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Remove an existing API token from an existing user
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
			throw new Error(`User not found: ${id}`)
		}

		const updatedTokens = user.apiTokens.filter(
			(token) => token !== tokenToRemove
		)
		await prisma.user.update({
			where: { id },
			data: {
				apiTokens: updatedTokens
			}
		})
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
		const key = `user:${id}:credits`
		const existingCredits = await redis.get(key)

		if (existingCredits === null) {
			throw new Error(`User not found: ${id}`)
		}

		const updatedCredits = await redis.incrby(key, credits)

		prisma.user.update({
			where: { id: Number(id) },
			data: {
				credits: updatedCredits
			}
		})
		res.send({ id, credits: updatedCredits })
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
		const { id } = req.body
		const credits = await redis.get(`user:${id}:credits`)

		if (credits === null) {
			throw new Error(`User not found: ${id}`)
		}
		res.send({ id, credits: Number(credits) })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Remove credits for an existing user
 *
 * @param req
 * @param res
 * @returns
 */
export async function removeCredits(req: Request, res: Response) {
	const queryCheck = UpdateCreditsSchema.safeParse(req.body)
	if (!queryCheck.success) {
		return handleAndReturnErrorResponse(req, res, queryCheck.error)
	}

	try {
		const { id, credits } = req.body
		const key = `user:${id}:credits`
		const existingCredits = await redis.get(key)

		if (existingCredits === null) {
			throw new Error(`User not found: ${id}`)
		}

		const updatedCredits = await redis.decrby(key, credits)

		prisma.user.update({
			where: { id: Number(id) },
			data: {
				credits: updatedCredits
			}
		})
		res.send({ id, credits: updatedCredits })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
