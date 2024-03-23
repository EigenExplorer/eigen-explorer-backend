import express from 'express';
import avsRoutes from './avs/avsRoutes.js';
import strategiesRoutes from './strategies/strategiesRoutes.js';

const apiRouter = express.Router();

apiRouter.use('/avs', avsRoutes);
apiRouter.use('/strategies', strategiesRoutes);

export default apiRouter;
