import type { Request, Response } from 'express'
import { EigenExplorerApiError, handleAndReturnErrorResponse } from '../../schema/errors'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { refreshAuthStore } from '../../utils/authMiddleware'
import { RegisterUserBodySchema } from '../../schema/zod/schemas/auth'
import { verifyMessage } from 'viem'
import prisma from '../../utils/prismaClient'
import crypto from 'node:crypto'

/**
 * Function for route /auth/users/:address/check-status
 * Protected route, returns whether a given address is registered on EE, if they are an EL staker & if we track their rewards
 *
 * @param req
 * @param res
 * @returns
 */
export async function checkUserStatus(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	try {
		const accessLevel = req.accessLevel || 0

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const { address } = req.params

		const [user, staker] = await Promise.all([
			prisma.user.findUnique({
				where: { address: address.toLowerCase() }
			}),
			prisma.staker.findUnique({
				where: { address: address.toLowerCase() }
			})
		])

		const isRegistered = !!user
		const isStaker = !!staker
		const isTracked = !!user?.isTracked

		res.send({ isRegistered, isStaker, isTracked })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /auth/users/:address/nonce
 * Protected route, generates a nonce to be used by frontend for registering a new user via wallet
 *
 * @param req
 * @param res
 * @returns
 */
export async function generateNonce(req: Request, res: Response) {
	try {
		const accessLevel = req.accessLevel || 0

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const nonce = `0x${crypto.randomBytes(32).toString('hex')}`

		res.send({ nonce })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /auth/users/:address/register
 * Protected route, adds an address to the User table if it doesn't exist
 *
 * @param req
 * @param res
 * @returns
 */
export async function registerUser(req: Request, res: Response) {
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const bodyCheck = RegisterUserBodySchema.safeParse(req.body)
	if (!bodyCheck.success) {
		return handleAndReturnErrorResponse(req, res, bodyCheck.error)
	}

	try {
		const accessLevel = req.accessLevel || 0

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const { address } = req.params
		const { signature, nonce } = bodyCheck.data

		const message = `Welcome to EigenExplorer!\n\nPlease sign this message to verify your wallet ownership.\n\nNonce: ${nonce}`

		const isValid = await verifyMessage({
			address: address as `0x${string}`,
			message,
			signature: signature as `0x${string}`
		})

		if (!isValid) {
			throw new Error('Invalid signature')
		}

		const existingUser = await prisma.user.findUnique({
			where: { address: address.toLowerCase() }
		})

		if (!existingUser) {
			await prisma.user.create({
				data: {
					address: address.toLowerCase(),
					isTracked: false
				}
			})
		}

		res.send({ isNewUser: !existingUser })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Protected route, refreshes the server's entire auth store. Called by Supabase edge fn signal-refresh
 * This function will fail if the caller does not use admin-level auth token
 *
 * @param req
 * @param res
 * @returns
 */
export async function signalRefreshAuthStore(req: Request, res: Response) {
	try {
		const accessLevel = req.accessLevel || 0

		if (accessLevel !== 999) {
			throw new EigenExplorerApiError({ code: 'unauthorized', message: 'Unauthorized access.' })
		}

		const status = await refreshAuthStore()

		if (!status) {
			throw new EigenExplorerApiError({
				code: 'internal_server_error',
				message: 'Refresh auth store failed.'
			})
		}

		res.status(200).json({ message: 'Auth store refreshed.' })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
