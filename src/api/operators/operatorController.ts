import { Request, Response } from 'express'
import prisma from '../../prisma/prismaClient'

export async function getAllOperators(req: Request, res: Response) {
	try {
		const operatorList = await prisma.operator.findMany()

		res.send({ operatorList })
	} catch (error) {
		console.error('Failed to fetch all operators', error)
		res.status(400).send('An error occurred while fetching data')
	}
}

export async function getOperator(req: Request, res: Response) {
	try {
		const { id } = req.params

		const operator = await prisma.operator.findUnique({
			where: { address: id }
		})

		res.send({ operator })
	} catch (error) {
		console.error('Failed to fetch all operators', error)
		res.status(400).send('An error occurred while fetching data')
	}
}
