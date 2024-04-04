import type { Request, Response } from 'express'
import prisma from '../../prisma/prismaClient'

/**
 * Route to get explorer metrics
 *
 * @param req
 * @param res
 */
export async function getMetrics(req: Request, res: Response) {
	try {
		const totalNumOfAVS = await prisma.avs.count()
		res.send({ totalNumOfAVS })
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
	}
}
