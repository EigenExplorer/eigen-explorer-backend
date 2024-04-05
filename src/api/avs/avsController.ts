import type { Request, Response } from 'express'
import { PaginationQuerySchema } from '../../schema/generic'
import prisma from '../../prisma/prismaClient'

/**
 * Route to get total number of AVSs
 *
 * @param req
 * @param res
 */
export async function getTotalNumOfAVS(req: Request, res: Response) {
	try {
		const totalNumOfAVS = await prisma.avs.count()
		res.send({ totalNumOfAVS })
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
	}
}

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

		let data = avsRecords.map((avs) => {
			const totalOperators = avs.operators.filter((o) => o.isActive).length
			const totalStakers = 1

			return {
				...avs,
				totalOperators,
				totalStakers,
				operators: undefined
			}
		})

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

		const totalOperators = avs.operators.filter((o) => o.isActive).length
		const totalStakers = 1

		res.send({ ...avs, operators: undefined, totalOperators, totalStakers })
	} catch (error) {
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}
