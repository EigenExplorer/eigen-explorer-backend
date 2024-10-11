import { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { getPrismaClient } from '../../utils/prismaClient'

/**
 * Route to fetch cached prices
 *
 * @param req
 * @param res
 */
export async function getCachedPrices(req: Request, res: Response) {
	try {
		const tokenPrices = await fetchTokenPrices()

		res.status(200).send(tokenPrices)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to fetch and display the last sync blocks for all blockSyncKeys
 *
 * @param req
 * @param res
 */
export async function getLastSyncBlocks(req: Request, res: Response) {
	try {
		const prismaClient = getPrismaClient()

		const ignoredBlockSyncKeys = ['withdrawMinDelayBlocks']

		const syncKeys = await prismaClient.settings.findMany({
			where: { key: { notIn: ignoredBlockSyncKeys } }
		})

		res.status(200).send(syncKeys)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
