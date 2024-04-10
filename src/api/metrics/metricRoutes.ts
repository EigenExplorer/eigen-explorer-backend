import express from 'express'
import { getMetrics } from './metricController'

const router = express.Router()

// API routes for /metrics
router.get('/', getMetrics)

export default router
