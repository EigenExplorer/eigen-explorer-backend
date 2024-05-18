import express from 'express'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'
import operatorRoutes from './operators/operatorRoutes'
import stakerRoutes from './stakers/stakerRoutes'
import metricRoutes from './metrics/metricRoutes'
import withdrawalRoutes from './withdrawals/withdrawalRoutes'

const apiRouter = express.Router()

apiRouter.use('/avs', avsRoutes)
apiRouter.use('/strategies', strategiesRoutes)
apiRouter.use('/operators', operatorRoutes)
apiRouter.use('/stakers', stakerRoutes)
apiRouter.use('/metrics', metricRoutes)
apiRouter.use('/withdrawals', withdrawalRoutes)

export default apiRouter
