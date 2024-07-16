import express from 'express'
import {
	generateToken,
	removeToken,
	addCredits,
	checkCredits,
	deductCredits
} from './authController'

const router = express.Router()

// User routes
router.get('/check-credits', checkCredits)

// Protected routes
router.post('/generate-token', generateToken)

router.post('/remove-token', removeToken)

router.post('/add-credits', addCredits)

router.post('/deduct-credits', deductCredits)

export default router
