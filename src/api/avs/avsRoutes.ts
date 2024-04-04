import express from 'express';
import { getAllAVS, getAVS } from './avsController';

const router = express.Router();

// API routes for /avs
router.get('/', getAllAVS);
router.get('/:id', getAVS);

export default router;
