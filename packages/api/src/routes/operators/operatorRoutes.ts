import express from 'express'
import {
	getAllOperators,
	getOperator,
	getAllOperatorAddresses,
	getOperatorRewards,
	getOperatorDelegationEvents,
	invalidateMetadata
} from './operatorController'

import routeCache from 'route-cache'

const router = express.Router()

// API routes for /operators

router.get('/addresses', routeCache.cacheSeconds(120), getAllOperatorAddresses)

/**
 * @openapi
 * /operators:
 *   get:
 *     summary: Retrieve all operators
 *     description: Returns all operator records. This endpoint supports pagination.
 *     tags:
 *       - Operators
 *     parameters:
 *       - in: query
 *         name: skip
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of records to skip for pagination.
 *       - in: query
 *         name: take
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *         description: Limit number of records to return (used for pagination).
 *     responses:
 *       200:
 *         description: A successful response with operator data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       operator:
 *                         $ref: '#/components/schemas/AvsOperator'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of operator records in the database.
 *                     skip:
 *                       type: integer
 *                       description: Number of records skipped in the current request.
 *                     take:
 *                       type: integer
 *                       description: Number of records returned in the current request.
 */
router.get('/', routeCache.cacheSeconds(120), getAllOperators)

/**
 * @openapi
 * /operators/{id}:
 *   get:
 *     summary: Retrieve an operator by ID
 *     description: Returns an operator record by ID.
 *     tags:
 *       - Operators
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Operator ID.
 *     responses:
 *       200:
 *         description: A successful response with operator data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 operator:
 *                   $ref: '#/components/schemas/AvsOperator'
 *       404:
 *         description: Operator not found.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'Operator not found.'
 */
router.get('/:address', routeCache.cacheSeconds(120), getOperator)

router.get('/:address/rewards', routeCache.cacheSeconds(120), getOperatorRewards)

router.get('/:address/events/delegation', routeCache.cacheSeconds(120), getOperatorDelegationEvents)

// Protected routes
router.get('/:address/invalidate-metadata', routeCache.cacheSeconds(120), invalidateMetadata)

export default router
