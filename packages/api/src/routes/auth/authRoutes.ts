import express from 'express'
import routeCache from 'route-cache'
import { signalRefreshStore, fetchRequests } from './authController'

const router = express.Router()
const hourlyCache = 3600 - (Math.floor(Date.now() / 1000) % 3600)

// API routes for /auth

router.get('/refresh-store', routeCache.cacheSeconds(5), signalRefreshStore)
router.get('/devs/:uuid/requests', routeCache.cacheSeconds(hourlyCache), fetchRequests)

export default router
