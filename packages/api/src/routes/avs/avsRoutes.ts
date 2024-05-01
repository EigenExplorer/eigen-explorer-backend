import express from 'express';
import {
    getAllAVS,
    getAllAVSAddresses,
    getAVS,
    getAVSOperators,
    getAVSStakers,
} from './avsController';

const router = express.Router();

// API routes for /avs
router.get('/addresses', getAllAVSAddresses);

router.get('/', getAllAVS);

router.get('/:address', getAVS);

router.get('/:address/stakers', getAVSStakers);

router.get('/:address/operators', getAVSOperators);

export default router;
