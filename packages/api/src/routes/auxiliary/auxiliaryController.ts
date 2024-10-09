import { Request, Response } from 'express'
import { cacheStore } from 'route-cache'
import { eigenContracts } from '../../data/address/eigenMainnetContracts'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import { getPrismaClient } from '../../utils/prismaClient'

/**
 * Route to fetch cached prices
 *
 * @param req
 * @param res
 */
export async function getCachedPrices(req: Request, res: Response) {
	try {
		const CMC_TOKEN_IDS = [
			8100, 21535, 27566, 23782, 29035, 24277, 28476, 15060, 23177, 8085, 25147,
			24760, 2396
		]
		const keysStr = CMC_TOKEN_IDS.join(',')
		let cachedPrices = await cacheStore.get(`price_${keysStr}`)

		if (!cachedPrices) {
			cachedPrices = await fetchStrategyTokenPrices();
		}

		const priceData = Object.values(cachedPrices).map(
			(cachedPrice: {
				symbol: string
				strategyAddress: string
				eth: number
				tokenAddress?: string
			}) => {
				const strategy = eigenContracts.Strategies[cachedPrice.symbol]
				return {
					...cachedPrice,
					tokenAddress: strategy?.tokenContract || null
				}
			}
		)

		res.status(200).send(priceData)
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

		const ignoredBlockSyncKeys = [
			'withdrawMinDelayBlocks'
		]

		const syncKeys = await prismaClient.settings.findMany({
			where: { key: { notIn: ignoredBlockSyncKeys } }
		})

		res.status(200).send(syncKeys)
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
