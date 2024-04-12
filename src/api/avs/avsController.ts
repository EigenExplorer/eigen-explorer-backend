import type { Request, Response } from 'express'
import { PaginationQuerySchema } from '../../schema/generic'
import prisma from '../../prisma/prismaClient'

/**
 * Route to get a list of all AVSs
 *
 * @param req
 * @param res
 */
export async function getAllAVS(req: Request, res: Response) {
	try {
		// Validate pagination query
		const {
			error,
			value: { skip, take }
		} = PaginationQuerySchema.validate(req.query)
		if (error) return res.status(422).json({ error: error.details[0].message })

		// Fetch count and record
		const avsCount = await prisma.avs.count()
		const avsRecords = await prisma.avs.findMany({ skip, take })

		const data = await Promise.all(
			avsRecords.map(async (avs) => {
				const operatorAddresses = avs.operators.map((o) => o.address)
				const operators = await prisma.operator.aggregate({
					where: { address: { in: operatorAddresses } },
					_sum: {
						totalStakers: true
					}
				})

				const totalOperators = avs.operators.filter((o) => o.isActive).length
				const totalStakers = operators._sum.totalStakers || 0

				return {
					...avs,
					totalOperators,
					totalStakers,
					operators: undefined
				}
			})
		)

		res.send({
			data,
			meta: {
				total: avsCount,
				skip,
				take
			}
		})
	} catch (error) {
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}

/**
 * Route to get a single AVS
 *
 * @param req
 * @param res
 */
export async function getAVS(req: Request, res: Response) {
	try {
		const { id } = req.params
		const avs = await prisma.avs.findUniqueOrThrow({ where: { address: id } })

		const operatorAddresses = avs.operators.map((o) => o.address)
		const operators = await prisma.operator.aggregate({
			where: { address: { in: operatorAddresses } },
			_sum: {
				totalStakers: true
			}
		})

		const totalOperators = avs.operators.filter((o) => o.isActive).length
		const totalStakers = operators._sum.totalStakers

		res.send({ ...avs, operators: undefined, totalOperators, totalStakers })
	} catch (error) {
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}
