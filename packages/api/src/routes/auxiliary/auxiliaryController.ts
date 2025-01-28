import { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { fetchTokenPrices } from '../../utils/tokenPrices'
import { getPrismaClient } from '../../utils/prismaClient'
import { getViemClient } from '../../viem/viemClient'
import { includedBlockSyncKeys } from '../../constants/syncKeys'
import { syncConfigs } from '../../constants/syncKeys'

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

/**
 * Route to fetch and display the difference between the current block
 *
 * @param req
 * @param res
 */
export async function getSyncDiff(req: Request, res: Response) {
	try {
		const prismaClient = getPrismaClient()
		const syncKeys = await prismaClient.settings.findMany({
			where: { key: { in: includedBlockSyncKeys } }
		})

		let isOutOfSync = false
		const currentBlock = await getViemClient().getBlockNumber()
		const currentTime = Date.now()

		const timeKeys = syncKeys.filter((s) => s.key.startsWith('lastSyncedTime'))
		const timeKeyDifferences = timeKeys.map((t) => {
			const config = syncConfigs.find((c) => c.key === t.key)
			const threshold = config?.syncThreshold || 0
			const difference = currentTime - Number(t.value)
			return {
				key: t.key,
				difference,
				outOfSync: difference > threshold
			}
		})

		const blockKeys = syncKeys.filter((s) => s.key.startsWith('lastSyncedBlock'))
		const blockKeyDifferences = blockKeys.map((b) => {
			const config = syncConfigs.find((c) => c.key === b.key)
			const threshold = config?.syncThreshold || 0
			const difference = Number(currentBlock) - Number(b.value)
			return {
				key: b.key,
				difference,
				outOfSync: difference > threshold
			}
		})

		if (
			timeKeyDifferences.some((t) => t.outOfSync) ||
			blockKeyDifferences.some((b) => b.outOfSync)
		) {
			isOutOfSync = true
		}

		res.status(isOutOfSync ? 409 : 200).send({
			isOutOfSync,
			syncKeys: [...timeKeyDifferences, ...blockKeyDifferences]
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to fetch and display all strategies and tokens
 *
 * @param req
 * @param res
 */
export async function getStrategies(req: Request, res: Response) {
	try {
		const prismaClient = getPrismaClient()

		const strategies = await prismaClient.strategies.findMany()
		const tokens = await prismaClient.tokens.findMany()

		res.status(200).send({ strategies, tokens })
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
