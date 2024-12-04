import express from 'express'
import routeCache from 'route-cache'
import { signalRefreshAuthStore } from './authController'

const router = express.Router()

// API routes for /auth

router.get('/refresh-store', routeCache.cacheSeconds(5), signalRefreshAuthStore)

export default router
