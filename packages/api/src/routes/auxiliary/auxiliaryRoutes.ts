import express from 'express'
import { getCachedPrices, getLastSyncBlocks, getStrategies } from './auxiliaryController'

const router = express.Router()

router.get('/prices', getCachedPrices)
router.get('/sync-status', getLastSyncBlocks)
router.get('/strategies', getStrategies)

export default router
