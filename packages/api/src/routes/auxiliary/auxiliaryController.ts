import { Request, Response } from 'express';
import { cacheStore } from 'route-cache';
import { blockSyncKeys } from '../../../../monitor/src/data/blockSyncKeys'
import {fetchLastSyncBlockInfo} from '../../../../monitor/src/utils/monitoring'

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
        ];
        const keysStr = CMC_TOKEN_IDS.join(',');
        
        const cachedPrices = await cacheStore.get(`price_${keysStr}`);

        return cachedPrices 
            ? res.json(cachedPrices) 
            : res.status(404).json({ message: 'No cached prices found.' });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching cached prices.' });
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
        const syncKeys = Object.values(blockSyncKeys).map(value => 
            typeof value === 'string' ? value : value[0]
        );

        const syncBlockData = await Promise.all(
            syncKeys.map(async key => {
                const blockInfo = await fetchLastSyncBlockInfo(key);
                return {
                    key,
                    lastBlock: blockInfo.lastBlock.toString(),
                    updatedAt: blockInfo.updatedAt,
                };
            })
        );

        return res.json(syncBlockData);
    } catch (error) {
        console.error('Error fetching sync block info');
        return res.status(500).json({ error: 'Error fetching sync block information.' });
    }
}