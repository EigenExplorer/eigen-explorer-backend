import express from 'express'
import routeCache from 'route-cache'
import { signalRefreshStore } from './authController'

const router = express.Router()

// API routes for /auth

router.get('/refresh-store', routeCache.cacheSeconds(5), signalRefreshStore)

export default router
