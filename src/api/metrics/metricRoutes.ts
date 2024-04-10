import express from 'express'
import {
	getMetrics,
	getTotalAvs,
	getTotalOperators,
	getTotalStakers,
	getTvl,
	getTvlBeaconChain,
	getTvlRestaking,
	getTvlRestakingByStrategy
} from './metricController'

const router = express.Router()

// API routes for /metrics
router.get('/', getMetrics)
router.get('/tvl', getTvl)
router.get('/tvl/beacon-chain', getTvlBeaconChain)
router.get('/tvl/restaking', getTvlRestaking)
router.get('/tvl/restaking/:strategy', getTvlRestakingByStrategy)

router.get('/total-avs', getTotalAvs)
router.get('/total-operators', getTotalOperators)
router.get('/total-stakers', getTotalStakers)

export default router
