import express from 'express'
import authRoutes from './auth/authRoutes'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'
import operatorRoutes from './operators/operatorRoutes'
import stakerRoutes from './stakers/stakerRoutes'
import metricRoutes from './metrics/metricRoutes'
import withdrawalRoutes from './withdrawals/withdrawalRoutes'
import depositRoutes from './deposits/depositRoutes'
import auxiliaryRoutes from './auxiliary/auxiliaryRoutes'
import rewardRoutes from './rewards/rewardRoutes'

const apiRouter = express.Router()

// Health route
apiRouter.get('/health', (_, res) => res.send({ status: 'ok' }))

// Version route
apiRouter.get('/version', (_, res) =>
	res.send({ version: process.env.API_VERSION || 'development' })
)

// Auth management routes
apiRouter.use('/auth', authRoutes)

// Remaining routes
apiRouter.use('/avs', avsRoutes)
apiRouter.use('/strategies', strategiesRoutes)
apiRouter.use('/operators', operatorRoutes)
apiRouter.use('/stakers', stakerRoutes)
apiRouter.use('/metrics', metricRoutes)
apiRouter.use('/withdrawals', withdrawalRoutes)
apiRouter.use('/deposits', depositRoutes)
apiRouter.use('/aux', auxiliaryRoutes)
apiRouter.use('/rewards', rewardRoutes)

export default apiRouter
