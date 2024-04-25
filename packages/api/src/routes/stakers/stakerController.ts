import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { PaginationQuerySchema } from '../../schema/generic'

/**
 * Route to get a list of all stakers
 *
 * @param req
 * @param res
 */
export async function getAllStakers(req: Request, res: Response) {
	try {
		// Validate pagination query
		const {
			error,
			value: { skip, take }
		} = PaginationQuerySchema.validate(req.query)
		if (error) return res.status(422).json({ error: error.details[0].message })

		// Fetch count and record
		const stakersCount = await prisma.staker.count()
		const stakersRecords = await prisma.staker.findMany({
			skip,
			take,
			include: { shares: true }
		})

		const data = await Promise.all(
			stakersRecords.map((staker) => {
				let tvl = 0

				staker.shares.map((ss) => {
					tvl += Number(BigInt(ss.shares)) / 1e18
				})

				return {
					...staker,
					tvl
				}
			})
		)

		res.send({
			data,
			meta: {
				total: stakersCount,
				skip,
				take
			}
		})
	} catch (error) {
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}

/**
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getStaker(req: Request, res: Response) {
	try {
		const { id } = req.params

		const staker = await prisma.staker.findUniqueOrThrow({
			where: { address: id },
			include: { shares: true }
		})

		let tvl = 0
		const shares = staker.shares

		shares.map((s) => {
			tvl += Number(s.shares) / 1e18
		})

		res.send({
			...staker,
			tvl
		})
	} catch (error) {
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}
