import express from 'express'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'

const apiRouter = express.Router()

apiRouter.use('/avs', avsRoutes)
apiRouter.use('/strategies', strategiesRoutes)

export default apiRouter
