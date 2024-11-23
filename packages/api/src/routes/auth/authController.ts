import type { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { RequestHeadersSchema } from '../../schema/zod/schemas/auth'
import prisma from '../../utils/prismaClient'

/**
 * Function for route /auth/users/:address/check-status
 * Returns whether a given address is registered on EE, if they are an EL staker & if we track their rewards
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
		const { address } = req.params

		const user = await prisma.user.findUnique({
			where: { address: address.toLowerCase() },
			include: { staker: true }
		})

		const isRegistered = !!user
		const isStaker = !!user?.staker
		const isTracked = !!user?.isTracked

		res.send({ isRegistered, isStaker, isTracked })
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

		const { address } = req.params

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
