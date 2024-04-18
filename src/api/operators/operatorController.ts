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

		const operators = operatorRecords.map((operator) => {
			let tvl = 0n
			const shares = operator.shares
			shares.map((s) => {
				tvl += BigInt(s.shares)
			})

			return {
				...operator,
				tvl: tvl.toString(),
				stakers: undefined
			}
		})

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

		res.send({
			...operator,
			stakers: undefined
		})
	} catch (error) {
		console.log(error)
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}
