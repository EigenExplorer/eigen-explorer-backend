import express from 'express'
import { postUpdateStore } from './authController'

const router = express.Router()

// API routes for /auth

router.post('/store/update', postUpdateStore)

export default router
