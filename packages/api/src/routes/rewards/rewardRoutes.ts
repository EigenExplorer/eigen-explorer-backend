import express from 'express'
import routeCache from 'route-cache'
import { getStrategies } from './rewardController'

const router = express.Router()

// API routes for /rewards

router.get('/strategies', routeCache.cacheSeconds(120), getStrategies)

export default router
