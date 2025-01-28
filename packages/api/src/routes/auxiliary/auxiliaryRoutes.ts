import express from 'express'
import {
	getCachedPrices,
	getLastSyncBlocks,
	getStrategies,
	getSyncDiff
} from './auxiliaryController'

import routeCache from 'route-cache'

const router = express.Router()

router.get('/prices', routeCache.cacheSeconds(120), getCachedPrices)
router.get('/strategies', routeCache.cacheSeconds(120), getStrategies)
router.get('/sync-status', routeCache.cacheSeconds(120), getLastSyncBlocks)
router.get('/sync-diff', routeCache.cacheSeconds(120), getSyncDiff)

export default router
