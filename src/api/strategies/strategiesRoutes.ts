import express from 'express';
import {
    getCbEthTvl,
    getStEthTvl,
    getREthTvl,
    getEthXTvl,
    getAnkrEthTvl,
    getOEthTvl,
    getOsEthTvl,
    getSwEthTvl,
    getWbEthTvl,
    getSfrxEthTvl,
    getLsEthTvl,
    getMEthTvl,
} from './strategiesController';

const router = express.Router();

// API routes for /strategies
router.get('/cbeth-tvl', getCbEthTvl);
router.get('/steth-tvl', getStEthTvl);
router.get('/reth-tvl', getREthTvl);
router.get('/ethx-tvl', getEthXTvl);
router.get('/ankreth-tvl', getAnkrEthTvl);
router.get('/oeth-tvl', getOEthTvl);
router.get('/oseth-tvl', getOsEthTvl);
router.get('/sweth-tvl', getSwEthTvl);
router.get('/wbeth-tvl', getWbEthTvl);
router.get('/sfrxeth-tvl', getSfrxEthTvl);
router.get('/lseth-tvl', getLsEthTvl);
router.get('/meth-tvl', getMEthTvl);

export default router;
