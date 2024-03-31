import { Request, Response } from 'express'

export async function getAllOperators(req: Request, res: Response) {
	try {
		res.send({ operatorList: [] })
	} catch (error) {
		console.error('Failed to fetch all operators', error)
		res.status(400).send('An error occurred while fetching data')
	}
}

export async function getOperator(req: Request, res: Response) {
	try {
		res.send({ operator: null })
	} catch (error) {
		console.error('Failed to fetch all operators', error)
		res.status(400).send('An error occurred while fetching data')
	}
}
