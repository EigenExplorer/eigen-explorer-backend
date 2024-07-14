import express from 'express'
import {
	generateToken,
	removeToken,
	addCredits,
	checkCredits,
	removeCredits
} from './authController'
import { authenticateJWT } from '../../utils/jwtUtils'

const router = express.Router()

router.post('/generate-token', authenticateJWT, generateToken)

router.post('/remove-token', authenticateJWT, removeToken)

router.post('/add-credits', authenticateJWT, addCredits)

router.get('/check-credits', authenticateJWT, checkCredits)

router.post('/remove-credits', authenticateJWT, removeCredits)

export default router
