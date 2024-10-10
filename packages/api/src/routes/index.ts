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

const apiRouter = express.Router()

// Health route
apiRouter.get('/health', (_, res) => res.send({ status: 'ok' }))

// Version route
apiRouter.get('/version', (_, res) =>
	res.send({ version: process.env.API_VERSION || 'development' })
)

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
apiRouter.use('/auth', authRoutes)

export default apiRouter
