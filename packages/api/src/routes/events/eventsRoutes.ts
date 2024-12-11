import express from 'express'
import routeCache from 'route-cache'
import {
	getDelegationEvents,
	getRewardsEvents,
	getDepositEvents,
	getWithdrawalEvents
} from './eventsController'

const router = express.Router()

// API routes for /events

router.get('/delegation', routeCache.cacheSeconds(120), getDelegationEvents)

router.get('/rewards', routeCache.cacheSeconds(120), getRewardsEvents)

router.get('/deposit', routeCache.cacheSeconds(120), getDepositEvents)

router.get('/withdrawal', routeCache.cacheSeconds(120), getWithdrawalEvents)

export default router