import express from 'express';
import { getAllAVS, getAllAVSAddresses, getAVS } from './avsController';

const router = express.Router();

// API routes for /avs

/**
 * @openapi
 * /avs:
 *   get:
 *     summary: Retrieve all AVS
 *     description: Returns all AVS records. This endpoint supports pagination.
 *     tags:
 *       - AVS
 *     parameters:
 *       - in: query
 *         name: skip
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip for pagination.
 *       - in: query
 *         name: take
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Limit number of records to return (used for pagination).
 *     responses:
 *       200:
 *         description: A successful response with AVS data.
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
 *                       avs:
 *                         $ref: '#/components/schemas/AVS'
 *                       totalOperators:
 *                         type: integer
 *                         description: Total number of active operators within the AVS.
 *                       totalStakers:
 *                         type: integer
 *                         description: Total number of stakers across all operators in this AVS.
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of AVS records in the database.
 *                     skip:
 *                       type: integer
 *                       description: Number of records skipped in the current request.
 *                     take:
 *                       type: integer
 *                       description: Number of records requested to return.
 *       422:
 *         description: Validation error on request parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message detailing what went wrong during request validation.
 *       400:
 *         description: General error during the data fetching process.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message detailing the issue encountered.
 */
router.get('/', getAllAVS);

/**
 * @openapi
 * /avs/addresses:
 *   get:
 *     summary: Retrieve addresses of all AVS
 *     description: This endpoint retrieves a paginated list of AVS addresses along with basic metadata such as the AVS name.
 *     tags:
 *       - AVS
 *     parameters:
 *       - in: query
 *         name: skip
 *         description: The number of records to skip for pagination.
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: take
 *         description: The number of records to return for pagination.
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved list of AVS addresses.
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
 *                       name:
 *                         type: string
 *                         description: The name of the AVS.
 *                       address:
 *                         type: string
 *                         description: The address of the AVS service contract.
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: The total number of AVS records in the database.
 *                     skip:
 *                       type: integer
 *                       description: The number of records skipped.
 *                     take:
 *                       type: integer
 *                       description: The number of records taken.
 *       422:
 *         description: Validation error in the request parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Detailed message of the validation error.
 *       400:
 *         description: Error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: General error message about the issue encountered.
 */

router.get('/addresses', getAllAVSAddresses);

/**
 * @openapi
 * /avs/{id}:
 *   get:
 *     summary: Retrieve an AVS by ID
 *     description: Returns a single AVS record by ID.
 *     tags:
 *       - AVS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier for the AVS.
 *     responses:
 *       200:
 *         description: A successful response with AVS data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AVS'
 *       404:
 *         description: AVS record not found.
 *       400:
 *         description: General error during the data fetching process.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message detailing the issue encountered.
 */
router.get('/:id', getAVS);

export default router;
