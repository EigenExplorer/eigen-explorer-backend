import express from 'express';
import {
    getMetrics,
    getTotalAvs,
    getTotalOperators,
    getTotalStakers,
    getTvl,
    getTvlBeaconChain,
    getTvlRestaking,
    getTvlRestakingByStrategy,
} from './metricController';

import routeCache from "route-cache";

const router = express.Router();

// API routes for /metrics

router.get('/', routeCache.cacheSeconds(120), getMetrics);

router.get('/tvl', routeCache.cacheSeconds(120), getTvl);

router.get('/tvl/beacon-chain', routeCache.cacheSeconds(120), getTvlBeaconChain);

router.get('/tvl/restaking', routeCache.cacheSeconds(120), getTvlRestaking);

router.get('/tvl/restaking/:strategy', routeCache.cacheSeconds(120), getTvlRestakingByStrategy);

router.get('/total-avs', routeCache.cacheSeconds(120), getTotalAvs);

router.get('/total-operators', routeCache.cacheSeconds(120), getTotalOperators);

router.get('/total-stakers', routeCache.cacheSeconds(120), getTotalStakers);

export default router;
