import express from 'express'
 import {
	createUser,
 	generateToken,
	revokeToken
 } from './authController'
 import { authenticateJWT } from '../../utils/jwt'

 const router = express.Router()

 // Protected routes
 router.get('/create-user', authenticateJWT, createUser)

 router.get('/generate-token', authenticateJWT, generateToken)

 router.get('/revoke-token', authenticateJWT,revokeToken)

 export default router