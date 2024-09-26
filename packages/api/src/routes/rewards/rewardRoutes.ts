import express from 'express'
import routeCache from 'route-cache'
import {
	getAvsRewards,
	getAvsRewardTokens,
	getAvsRewardStrategies,
	getAvsRewardsApy
	// getOperatorRewardsApy
} from './rewardController'

const router = express.Router()

// API routes for /rewards

router.get('/avs/:address', routeCache.cacheSeconds(120), getAvsRewards)
router.get(
	'/avs/:address/tokens',
	routeCache.cacheSeconds(120),
	getAvsRewardTokens
)
router.get(
	'/avs/:address/strategies',
	routeCache.cacheSeconds(120),
	getAvsRewardStrategies
)

router.get('/avs/:address/apy', routeCache.cacheSeconds(120), getAvsRewardsApy)

/*
router.get(
	'/operators/:address/apy',
	routeCache.cacheSeconds(120),
	getOperatorRewardsApy
)
	*/

export default router
