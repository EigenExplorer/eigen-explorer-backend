import express from 'express'
import {
	getAllAVS,
	getAllAVSAddresses,
	getAVS,
	getAVSOperators,
	getAVSStakers,
	getAVSRewards,
	getAVSRewardsEvents,
	getAvsOperatorSets,
	getAvsOperatorSetDetails,
	getAvsAllocations,
	getAvsSlashed,
	getAvsOperatorSetOperators,
	invalidateMetadata,
	getAvsRegistrationEvents,
	getAllMetadata,
	getMetadata,
	updateMetadata,
	deleteMetadata,
	deleteAllMetadata
} from './avsController'

import routeCache from 'route-cache'

const router = express.Router()

// API routes for /avs
router.get('/', routeCache.cacheSeconds(120), getAllAVS)

router.get('/addresses', routeCache.cacheSeconds(120), getAllAVSAddresses)

router.get('/get-all-metadata', routeCache.cacheSeconds(5), getAllMetadata) // Protected route for area-internal-dashboard

router.get('/:address', routeCache.cacheSeconds(120), getAVS)

router.get('/:address/stakers', routeCache.cacheSeconds(120), getAVSStakers)

router.get('/:address/operators', routeCache.cacheSeconds(120), getAVSOperators)

router.get('/:address/rewards', routeCache.cacheSeconds(120), getAVSRewards)

router.get('/:address/events/rewards', routeCache.cacheSeconds(120), getAVSRewardsEvents)

router.get(
	'/:address/events/registration-status',
	routeCache.cacheSeconds(120),
	getAvsRegistrationEvents
)

router.get('/:address/operator-sets', routeCache.cacheSeconds(120), getAvsOperatorSets)

router.get(
	'/:address/operator-sets/:operatorSetId',
	routeCache.cacheSeconds(120),
	getAvsOperatorSetDetails
)

router.get(
	'/:address/operator-sets/:operatorSetId/operators',
	routeCache.cacheSeconds(120),
	getAvsOperatorSetOperators
)

router.get('/:address/allocations', routeCache.cacheSeconds(120), getAvsAllocations)

router.get('/:address/slashed', routeCache.cacheSeconds(120), getAvsSlashed)

// Protected routes
router.get('/:address/invalidate-metadata', routeCache.cacheSeconds(120), invalidateMetadata)
// Protected AVS-specific routes custom for area-internal-dashboard
router.get('/:address/get-metadata', routeCache.cacheSeconds(5), getMetadata)

router.post('/:address/update-metadata', updateMetadata)

router.post('/:address/delete-metadata', deleteMetadata)

router.post('/:address/delete-all-metadata', deleteAllMetadata)

router.get('/:address/invalidate-metadata', routeCache.cacheSeconds(120), invalidateMetadata) // Legacy

export default router
