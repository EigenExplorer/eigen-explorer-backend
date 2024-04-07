import express from 'express';
import { getStrategyTvl, getTotalTvl } from './strategiesController';

const router = express.Router();

// API routes for /strategies
router.get('/tvl', getTotalTvl);
router.get('/tvl/:strategyName', getStrategyTvl);

export default router;
