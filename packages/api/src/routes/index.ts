import express from 'express';
import avsRoutes from './avs/avsRoutes';
import operatorRoutes from './operators/operatorRoutes';
import metricRoutes from './metrics/metricRoutes';

const apiRouter = express.Router();

apiRouter.use('/metrics', metricRoutes);
apiRouter.use('/avs', avsRoutes);
apiRouter.use('/operators', operatorRoutes);

export default apiRouter;
