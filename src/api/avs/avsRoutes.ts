import express from 'express'
import { getTotalNumOfAVS } from './avsController'

const router = express.Router()

// API routes for /avs
router.get('/count', getTotalNumOfAVS)

export default router
