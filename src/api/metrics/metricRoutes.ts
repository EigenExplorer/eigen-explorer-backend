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
 *     summary: Retrieve the total value locked (TVL) in the beacon chain eigen pods
 *     description: Fetches the total value locked (TVL) in the beacon chain restaking eigen pods.
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

/**
 * @openapi
 * /metrics/tvl/restaking:
 *   get:
 *     summary: Retrieve the total value locked (TVL) in LST strategies
 *     description: Fetches the total value locked (TVL) in LST strategies.
 *     tags:
 *       - TVL
 *     responses:
 *       200:
 *         description: Successfully retrieved the total value locked in LST strategies.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tvl:
 *                   type: number
 *                   description: The total value locked in restaking strategies.
 *                 tvlStrategies:
 *                   type: object
 *                   description: The total value locked in each LST strategy.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/tvl/restaking', getTvlRestaking);

/**
 * @openapi
 * /metrics/tvl/restaking/{strategy}:
 *   get:
 *     summary: Retrieve the total value locked (TVL) in a specific LST strategy
 *     description: Fetches the total value locked (TVL) in a specific LST strategy.
 *     tags:
 *       - TVL
 *     parameters:
 *       - in: path
 *         name: strategy
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the LST strategy.
 *     responses:
 *       200:
 *         description: Successfully retrieved the total value locked in the specified LST strategy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tvl:
 *                   type: number
 *                   description: The total value locked in the specified LST strategy.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/tvl/restaking/:strategy', getTvlRestakingByStrategy);

/**
 * @openapi
 * /metrics/total-avs:
 *   get:
 *     summary: Retrieve the total number of AVS
 *     description: Fetches the total number of AVS registered.
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Successfully retrieved the total number of AVS.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAvs:
 *                   type: number
 *                   description: The total number of AVS registered.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/total-avs', getTotalAvs);

/**
 * @openapi
 * /metrics/total-operators:
 *   get:
 *     summary: Retrieve the total number of operators
 *     description: Fetches the total number of operators.
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Successfully retrieved the total number of operators.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOperators:
 *                   type: number
 *                   description: The total number of operators.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/total-operators', getTotalOperators);

/**
 * @openapi
 * /metrics/total-stakers:
 *   get:
 *     summary: Retrieve the total number of stakers
 *     description: Fetches the total number of stakers across all operators.
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Successfully retrieved the total number of stakers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStakers:
 *                   type: number
 *                   description: The total number of stakers across all operators.
 *       400:
 *         description: An error occurred while fetching data.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'An error occurred while fetching data.'
 */
router.get('/total-stakers', getTotalStakers);

export default router;
