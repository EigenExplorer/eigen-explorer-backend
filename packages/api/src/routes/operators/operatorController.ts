import type { Request, Response } from 'express'
import prisma from '../../prisma/prismaClient'
import { PaginationQuerySchema } from '../../schema/generic'

/**
 * Route to get a list of all operators
 *
 * @param req
 * @param res
 */
export async function getAllOperators(req: Request, res: Response) {
	try {
		// Validate pagination query
		const {
			error,
			value: { skip, take }
		} = PaginationQuerySchema.validate(req.query)
		if (error) return res.status(422).json({ error: error.details[0].message })

		// Fetch count and record
		const operatorCount = await prisma.operator.count()
		const operatorRecords = await prisma.operator.findMany({ skip, take })

		const operators = await Promise.all(
			operatorRecords.map(async (operator) => {
				let tvl = 0
				const shares = operator.shares
				const totalStakers = await prisma.staker.count({
					where: { delegatedTo: operator.address }
				})

				shares.map((s) => {
					tvl += Number(s.shares) / 1e18
				})

				return {
					...operator,
					tvl,
					totalStakers,
					stakers: undefined
				}
			})
		)

		res.send({
			data: operators,
			meta: {
				total: operatorCount,
				skip,
				take
			}
		})
	} catch (error) {
		console.log('error', error)
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}

/**
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getOperator(req: Request, res: Response) {
	try {
		const { id } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: id }
		})

		const totalStakers = await prisma.staker.count({
			where: { delegatedTo: operator.address }
		})

		let tvl = 0
		const shares = operator.shares

		shares.map((s) => {
			tvl += Number(s.shares) / 1e18
		})

		res.send({
			...operator,
			tvl,
			totalStakers,
			stakers: undefined
		})
	} catch (error) {
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}
