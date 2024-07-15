import express from 'express'
import {
	generateToken,
	removeToken,
	addCredits,
	checkCredits,
	deductCredits
} from './authController'
import { authenticateJWT } from '../../utils/jwt'

const router = express.Router()

// User routes
router.get('/check-credits', checkCredits)

// Protected routes
router.post('/generate-token', authenticateJWT, generateToken)

router.post('/remove-token', authenticateJWT, removeToken)

router.post('/add-credits', authenticateJWT, addCredits)

router.post('/deduct-credits', authenticateJWT, deductCredits)

export default router
