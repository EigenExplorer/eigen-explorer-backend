import express from 'express'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'
import operatorRoutes from './operators/operatorRoutes'

const apiRouter = express.Router()

apiRouter.use('/avs', avsRoutes)
apiRouter.use('/strategies', strategiesRoutes)
apiRouter.use('/operators', operatorRoutes)

export default apiRouter
