import express from 'express';
import { getStrategyTvl } from './strategiesController';

const router = express.Router();

// API routes for /strategies
router.get('/:strategyName', getStrategyTvl);

export default router;
