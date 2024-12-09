import express from 'express'
import routeCache from 'route-cache'
import { signalRefreshAuthStore } from './authController'
import { checkUserStatus, generateNonce, registerUser } from './authController'

const router = express.Router()

// API routes for /auth

router.get('/refresh-store', routeCache.cacheSeconds(5), signalRefreshAuthStore)
router.get('/users/:address/check-status', routeCache.cacheSeconds(30), checkUserStatus)
router.get('/users/:address/nonce', routeCache.cacheSeconds(10), generateNonce)
router.post('/users/:address/register', routeCache.cacheSeconds(10), registerUser)

export default router
