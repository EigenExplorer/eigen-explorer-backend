import express, { type Router } from 'express'
import avsRoutes from './avs/avsRoutes'
import strategiesRoutes from './strategies/strategiesRoutes'
import operatorRoutes from './operators/operatorRoutes'
import stakerRoutes from './stakers/stakerRoutes'
import metricRoutes from './metrics/metricRoutes'
import withdrawalRoutes from './withdrawals/withdrawalRoutes'
import depositRoutes from './deposits/depositRoutes'
import auxiliaryRoutes from './auxiliary/auxiliaryRoutes'
import rewardRoutes from './rewards/rewardRoutes'
import eventRoutes from './events/eventsRoutes'
import authRoutes from './auth/authRoutes'
import { authenticator, isAuthRequired, rateLimiter } from '../utils/authMiddleware'

const apiRouter = express.Router()

const setMiddleware = (router: Router) => {
	return isAuthRequired() ? [authenticator, rateLimiter, router] : [router]
}

// Health route
apiRouter.get('/health', (_, res) => res.send({ status: 'ok' }))

// Version route
apiRouter.get('/version', (_, res) =>
	res.send({ version: process.env.API_VERSION || 'development' })
)

// Remaining routes
const routes = {
	'/avs': avsRoutes,
	'/strategies': strategiesRoutes,
	'/operators': operatorRoutes,
	'/stakers': stakerRoutes,
	'/metrics': metricRoutes,
	'/withdrawals': withdrawalRoutes,
	'/deposits': depositRoutes,
	'/aux': auxiliaryRoutes,
	'/rewards': rewardRoutes,
	'/events': eventRoutes,
	'/auth': authRoutes
}

for (const [path, router] of Object.entries(routes)) {
	apiRouter.use(path, ...setMiddleware(router))
}

export default apiRouter
