import express from 'express';
import { getTotalNumOfAVS } from './avsController.js';

const router = express.Router();

// API routes for /strategies
router.get('/total-tvl', getTotalTVL);

export default router;
