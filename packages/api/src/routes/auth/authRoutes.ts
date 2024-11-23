import express from 'express'
import routeCache from 'route-cache'
import { checkUserStatus, registerUser } from './authController'

const router = express.Router()

// API routes for /auth

router.get('/users/:address/check-status', routeCache.cacheSeconds(30), checkUserStatus)
router.post('/users/:address/register', routeCache.cacheSeconds(240), registerUser)

export default router
