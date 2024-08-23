import express from 'express'
import {
	getMetrics,
	getTotalAvs,
	getTotalOperators,
	getTotalStakers,
	getTvl,
	getTvlBeaconChain,
	getTvlRestaking,
	getTvlRestakingByStrategy,
	getHistoricalAvsCount,
	getHistoricalOperatorCount,
	getHistoricalStakerCount,
	getHistoricalDepositCount,
	getHistoricalWithdrawalCount,
	getHistoricalAvsAggregate,
	getHistoricalOperatorsAggregate,
	getHistoricalTvl,
	getHistoricalTvlBeaconChain,
	getHistoricalTvlRestaking,
	getHistoricalTvlWithdrawal,
	getHistoricalTvlDeposit,
	getTotalWithdrawals,
	getTotalDeposits,
	getRestakingRatio,
	getDeploymentRatio
} from './metricController'

import routeCache from 'route-cache'

const router = express.Router()
const dailyCache = Math.floor((new Date ().setHours(24, 0, 0, 0) - Date.now()) / 1000)

// API routes for /metrics

// --- Holistic Routes ---

router.get('/', routeCache.cacheSeconds(120), getMetrics)

// --- TVL Routes ---

router.get('/tvl', routeCache.cacheSeconds(dailyCache), getTvl)
router.get('/tvl/beacon-chain', routeCache.cacheSeconds(dailyCache), getTvlBeaconChain)
router.get('/tvl/restaking', routeCache.cacheSeconds(dailyCache), getTvlRestaking)
router.get(
	'/tvl/restaking/:strategy',
	routeCache.cacheSeconds(dailyCache),
	getTvlRestakingByStrategy
)

// --- Total Routes ---

router.get('/total-avs', routeCache.cacheSeconds(120), getTotalAvs)
router.get('/total-operators', routeCache.cacheSeconds(120), getTotalOperators)
router.get('/total-stakers', routeCache.cacheSeconds(120), getTotalStakers)
router.get(
	'/total-withdrawals',
	routeCache.cacheSeconds(120),
	getTotalWithdrawals
)
router.get('/total-deposits', routeCache.cacheSeconds(120), getTotalDeposits)

// --- Historical TVL Routes ---

router.get('/historical/tvl', routeCache.cacheSeconds(120), getHistoricalTvl)
router.get(
	'/historical/tvl/beacon-chain',
	routeCache.cacheSeconds(120),
	getHistoricalTvlBeaconChain
)
router.get(
	'/historical/tvl/restaking/:address',
	routeCache.cacheSeconds(120),
	getHistoricalTvlRestaking
)
router.get(
	'/historical/withdrawals',
	routeCache.cacheSeconds(120),
	getHistoricalTvlWithdrawal
)
router.get(
	'/historical/deposits',
	routeCache.cacheSeconds(120),
	getHistoricalTvlDeposit
)

// --- Historical Aggregate Routes ---

router.get(
	'/historical/avs/:address',
	routeCache.cacheSeconds(120),
	getHistoricalAvsAggregate
)
router.get(
	'/historical/operators/:address',
	routeCache.cacheSeconds(120),
	getHistoricalOperatorsAggregate
)

// --- Historical Count Routes ---

router.get(
	'/historical/count-avs',
	routeCache.cacheSeconds(120),
	getHistoricalAvsCount
)
router.get(
	'/historical/count-operators',
	routeCache.cacheSeconds(120),
	getHistoricalOperatorCount
)
router.get(
	'/historical/count-stakers',
	routeCache.cacheSeconds(120),
	getHistoricalStakerCount
)
router.get(
	'/historical/count-withdrawals',
	routeCache.cacheSeconds(120),
	getHistoricalWithdrawalCount
)
router.get(
	'/historical/count-deposits',
	routeCache.cacheSeconds(120),
	getHistoricalDepositCount
)

router.get(
	'/restaking-ratio', 
	routeCache.cacheSeconds(120), 
	getRestakingRatio
)

router.get(
  '/deployment-ratio',
	routeCache.cacheSeconds(120),
	getDeploymentRatio
)

export default router