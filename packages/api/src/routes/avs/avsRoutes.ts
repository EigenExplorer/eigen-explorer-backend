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
router.get('/:address', getAVS);

router.get('/:id/stakers', getAVSStakers);

router.get('/:id/operators', getAVSOperators);

export default router;
