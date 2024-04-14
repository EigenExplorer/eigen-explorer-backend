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

const router = express.Router();

// API routes for /metrics

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Retrieve explorer metrics
 *     description: Fetches various metrics including total value locked in restaking, beacon chain, total number of AVS, operators, and stakers.
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Successfully retrieved the metrics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tvl:
 *                   type: number
 *                   description: Total value locked combining restaking and beacon chain.
 *                 tvlRestaking:
 *                   type: number
 *                   description: Total value locked in restaking.
 *                 tvlBeaconChain:
 *                   type: number
 *                   description: Total value locked in the beacon chain.
 *                 totalAvs:
 *                   type: number
 *                   description: Total number of AVS registered.
 *                 totalOperators:
 *                   type: number
 *                   description: Total number of operators.
 *                 totalStakers:
 *                   type: number
 *                   description: Total number of stakers.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/', getMetrics);

/**
 * @openapi
 * /metrics/tvl:
 *   get:
 *     summary: Retrieve the total value locked (TVL) from all strategies
 *     description: Fetches the total value locked (TVL) LST strategies and the beacon chain restaking.
 *     tags:
 *       - TVL
 *     responses:
 *       200:
 *         description: Successfully retrieved the total value locked.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tvl:
 *                   type: number
 *                   description: The combined total value locked in restaking and the beacon chain.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/tvl', getTvl);

/**
 * @openapi
 * /metrics/tvl/beacon-chain:
 *   get:
 *     summary: Retrieve the total value locked (TVL) in the beacon chain
 *     description: Fetches the total value locked (TVL) in the beacon chain restaking.
 *     tags:
 *       - TVL
 *     responses:
 *       200:
 *         description: Successfully retrieved the total value locked in the beacon chain.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tvl:
 *                   type: number
 *                   description: The total value locked in the beacon chain.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/tvl/beacon-chain', getTvlBeaconChain);
router.get('/tvl/restaking', getTvlRestaking);
router.get('/tvl/restaking/:strategy', getTvlRestakingByStrategy);

router.get('/total-avs', getTotalAvs);
router.get('/total-operators', getTotalOperators);
router.get('/total-stakers', getTotalStakers);

export default router;
