import express from 'express'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'
import operatorRoutes from './operators/operatorRoutes'
import stakerRoutes from './stakers/stakerRoutes'
import metricRoutes from './metrics/metricRoutes'
import withdrawalRoutes from './withdrawals/withdrawalRoutes'
import depositRoutes from './deposits/depositRoutes'
import auxiliaryRoutes from './auxiliary/auxiliaryRoutes'
import authRoutes from './auth/authRoutes'
import rewardRoutes from './rewards/rewardRoutes'
import { rateLimiter } from '../utils/auth'

const apiRouter = express.Router()

// Health route
apiRouter.get('/health', (_, res) => res.send({ status: 'ok' }))

// Version route
apiRouter.get('/version', (_, res) =>
	res.send({ version: process.env.API_VERSION || 'development' })
)

// Remaining routes
apiRouter.use('/avs', rateLimiter, avsRoutes)
apiRouter.use('/strategies', rateLimiter, strategiesRoutes)
apiRouter.use('/operators', rateLimiter, operatorRoutes)
apiRouter.use('/stakers', rateLimiter, stakerRoutes)
apiRouter.use('/metrics', rateLimiter, metricRoutes)
apiRouter.use('/withdrawals', rateLimiter, withdrawalRoutes)
apiRouter.use('/deposits', rateLimiter, depositRoutes)
apiRouter.use('/aux', rateLimiter, auxiliaryRoutes)
apiRouter.use('/auth', rateLimiter, authRoutes)
apiRouter.use('/rewards', rateLimiter, rewardRoutes)

export default apiRouter
