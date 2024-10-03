import express from 'express'
import { getCachedPrices, getLastSyncBlocks } from './auxiliaryController'

const router = express.Router()

router.get('/prices', getCachedPrices)
router.get('/sync-status', getLastSyncBlocks)

export default router
