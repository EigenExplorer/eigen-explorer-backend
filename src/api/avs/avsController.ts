import { Request, Response } from 'express'
import prisma from '../../prisma/prismaClient'

export async function getTotalNumOfAVS(req: Request, res: Response) {
	try {
		const totalNumOfAVS = await prisma.avs.count()
		res.send({ totalNumOfAVS })
	} catch (error) {
		// Handle any potential errors that might occur during the fetch operation
		console.error('Failed to fetch total number of AVS:', error)
		res.status(500).send('An error occurred while fetching data.')
	}
}

export async function getAllAVS(req: Request, res: Response) {
	try {
		res.send({ avsList: [] })
	} catch (error) {
		console.error('Failed to fetch all operators', error)
		res.status(400).send('An error occurred while fetching data')
	}
}

export async function getAVS(req: Request, res: Response) {
	try {
		res.send({ avs: null })
	} catch (error) {
		console.error('Failed to fetch all operators', error)
		res.status(400).send('An error occurred while fetching data')
	}
}
