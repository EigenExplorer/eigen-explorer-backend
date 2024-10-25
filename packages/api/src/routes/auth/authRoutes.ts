import express from 'express'
import { signalRefreshStore } from './authController'

const router = express.Router()

// API routes for /auth

router.get('/refresh-store', signalRefreshStore)

export default router
