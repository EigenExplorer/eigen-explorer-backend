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
		res.send({
			totalAvs: await getTotalAvsCount(),
			totalOperators: await getTotalOperatorCount(),
			totalStakers: await getTotalStakerCount()
		})
	} catch (error) {
		res.status(400).send('An error occurred while fetching data.')
	}
}

async function getTvl() {
	
}

async function getTotalAvsCount() {
	return await prisma.avs.count()
}

async function getTotalOperatorCount() {
	return await prisma.operator.count()
}

async function getTotalStakerCount() {
	return await prisma.operator.count()
}