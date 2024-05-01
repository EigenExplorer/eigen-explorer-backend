import express from 'express';
import {
    getAllAVS,
    getAllAVSAddresses,
    getAVS,
    getAVSOperators,
    getAVSStakers,
} from './avsController';

import routeCache from "route-cache";

const router = express.Router();

// API routes for /avs
router.get('/addresses', routeCache.cacheSeconds(120), getAllAVSAddresses);

router.get('/', routeCache.cacheSeconds(120), getAllAVS);

router.get('/:address', routeCache.cacheSeconds(120), getAVS);

router.get('/:address/stakers', routeCache.cacheSeconds(120), getAVSStakers);

router.get('/:address/operators', routeCache.cacheSeconds(120), getAVSOperators);

export default router;
