import express from 'express'
import routeCache from 'route-cache'
import { getProgrammaticIncentives, getStrategies } from './rewardController'

const router = express.Router()

// API routes for /rewards

router.get('/strategies', routeCache.cacheSeconds(120), getStrategies)

router.get('/programmatic-incentives', routeCache.cacheSeconds(120), getProgrammaticIncentives)

export default router
