import express from 'express'
import { postUpdateStore, postRefreshStore } from './authController'

const router = express.Router()

// API routes for /auth

router.post('/store/update', postUpdateStore)

router.post('/store/refresh', postRefreshStore)

export default router
