import express from 'express'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'
import operatorRoutes from './operators/operatorRoutes'
import metricRoutes from './metrics/metricRoutes'

const apiRouter = express.Router()

apiRouter.use('/avs', avsRoutes)
apiRouter.use('/strategies', strategiesRoutes)
apiRouter.use('/operators', operatorRoutes)
apiRouter.use('/metrics', metricRoutes)

export default apiRouter
