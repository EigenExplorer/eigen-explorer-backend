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
	getHistoricalWithdrawalAggregate,
	getHistoricalDepositAggregate,
	getTotalWithdrawals,
	getTotalDeposits
} from './metricController'

import routeCache from 'route-cache'

const router = express.Router()

// API routes for /metrics

router.get('/', routeCache.cacheSeconds(120), getMetrics)

router.get('/tvl', routeCache.cacheSeconds(120), getTvl)

router.get('/tvl/beacon-chain', routeCache.cacheSeconds(120), getTvlBeaconChain)

router.get('/tvl/restaking', routeCache.cacheSeconds(120), getTvlRestaking)

router.get(
	'/tvl/restaking/:strategy',
	routeCache.cacheSeconds(120),
	getTvlRestakingByStrategy
)

router.get('/total-avs', routeCache.cacheSeconds(120), getTotalAvs)

router.get('/total-operators', routeCache.cacheSeconds(120), getTotalOperators)

router.get('/total-stakers', routeCache.cacheSeconds(120), getTotalStakers)

router.get(
	'/total-withdrawals',
	routeCache.cacheSeconds(120),
	getTotalWithdrawals
)

router.get('/total-deposits', routeCache.cacheSeconds(120), getTotalDeposits)

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
 
router.get(
	'/historical/stakers',
	routeCache.cacheSeconds(120),
	getHistoricalStakerCount
)

router.get(
	'/historical/withdrawals',
	routeCache.cacheSeconds(120),
	getHistoricalWithdrawalAggregate
)

router.get(
	'/historical/deposits',
	routeCache.cacheSeconds(120),
	getHistoricalDepositAggregate
)

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
	'/historical/count-withdrawals',
	routeCache.cacheSeconds(120),
	getHistoricalWithdrawalCount
)

router.get(
	'/historical/count-deposits',
	routeCache.cacheSeconds(120),
	getHistoricalDepositCount
)

export default router
