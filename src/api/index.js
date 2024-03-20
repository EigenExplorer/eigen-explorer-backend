import express from 'express';
import avsRoutes from './avs/avsRoutes.js';

const apiRouter = express.Router();

apiRouter.use('/avs', avsRoutes);

export default apiRouter;
