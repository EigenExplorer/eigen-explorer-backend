import express from 'express'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'
import operatorRoutes from './operators/operatorRoutes'
import stakerRoutes from './stakers/stakerRoutes'
import metricRoutes from './metrics/metricRoutes'
import withdrawalRoutes from './withdrawals/withdrawalRoutes'
import depositRoutes from './deposits/depositRoutes'
import auxiliaryRoutes from './auxiliary/auxiliaryRoutes'
import rewardRoutes from './rewards/rewardRoutes'
import authRoutes from './auth/authRoutes'
import { authenticator, rateLimiter } from '../utils/authMiddleware'

const apiRouter = express.Router()

// Health route
apiRouter.get('/health', (_, res) => res.send({ status: 'ok' }))

// Version route
apiRouter.get('/version', (_, res) =>
	res.send({ version: process.env.API_VERSION || 'development' })
)

// Remaining routes
apiRouter.use('/avs', authenticator, rateLimiter, avsRoutes)
apiRouter.use('/strategies', authenticator, rateLimiter, strategiesRoutes)
apiRouter.use('/operators', authenticator, rateLimiter, operatorRoutes)
apiRouter.use('/stakers', authenticator, rateLimiter, stakerRoutes)
apiRouter.use('/metrics', authenticator, rateLimiter, metricRoutes)
apiRouter.use('/withdrawals', authenticator, rateLimiter, withdrawalRoutes)
apiRouter.use('/deposits', authenticator, rateLimiter, depositRoutes)
apiRouter.use('/aux', authenticator, rateLimiter, auxiliaryRoutes)
apiRouter.use('/rewards', authenticator, rateLimiter, rewardRoutes)
apiRouter.use('/auth', authenticator, rateLimiter, authRoutes)

export default apiRouter
