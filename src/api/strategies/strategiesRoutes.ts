import express from 'express';
import { getStrategyTvl, getTotalTvl } from './strategiesController';

const router = express.Router();

// API routes for /strategies

/**
 * @openapi
 * /strategy/tvl:
 *   get:
 *     summary: Retrieve total TVL from all strategies
 *     description: Returns the total value locked (TVL) in LST strategies and beacon chain restaking.
 *     tags:
 *       - Strategies
 *     responses:
 *       200:
 *         description: Successfully retrieved the total TVL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTvl:
 *                   type: string
 *                   description: The total TVL summed from all strategies, returned as a string to maintain precision in large numbers.
 *       500:
 *         description: Server error occurred while fetching the data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message describing why the data fetch operation failed.
 */
router.get('/tvl', getTotalTvl);

/**
 * @openapi
 * /strategy/tvl/{strategyName}:
 *   get:
 *     summary: Retrieve a strategy TVL by name
 *     description: Returns the total value locked (TVL) for a given LST strategy by name.
 *     tags:
 *       - Strategies
 *     parameters:
 *       - in: path
 *         name: strategyName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the strategy for which to retrieve TVL.
 *     responses:
 *       200:
 *         description: Successfully retrieved the TVL for the specified strategy.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: The TVL of the specified strategy, returned as a string to preserve precision for large values.
 *       400:
 *         description: Strategy name not provided in the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the strategy name is required.
 *       404:
 *         description: Strategy not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the specified strategy does not exist.
 *       500:
 *         description: Server error occurred while fetching the data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message describing why the data fetch operation failed.
 */
router.get('/tvl/:strategyName', getStrategyTvl);

export default router;
