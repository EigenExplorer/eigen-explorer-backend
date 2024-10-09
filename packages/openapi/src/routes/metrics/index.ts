import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getAllMetrics } from './getAllMetrics';
import { getTvlMetrics } from './getTvl';
import { getBeaconChainTvlMetric } from './getTvlBeaconChain';
import { getRestakingTvlMetrics } from './getTvlRestaking';
import { getTvlRestakingMetricByStrategy } from './getTvlByStrategy';
import { getTotalAvsMetric } from './getTotalAvs';
import { getTotalOperatorsMetric } from './getTotalOperators';
import { getTotalStakerssMetric } from './getTotalStakers';
import { getTotalWithdrawals } from './getTotalWithdrawals';
import { getTotalDeposits } from './getTotalDeposits';
import { getDeploymentRatio } from './getDeploymentRatio';
import { getRestakingRatio } from './getRestakingRatio';

export const metricsRoutes: ZodOpenApiPathsObject = {
    '/metrics': {
        get: getAllMetrics,
    },
    '/metrics/tvl': { get: getTvlMetrics },
    '/metrics/tvl/beacon-chain': { get: getBeaconChainTvlMetric },
    '/metrics/tvl/restaking': { get: getRestakingTvlMetrics },
    '/metrics/tvl/restaking/{strategy}': {
        get: getTvlRestakingMetricByStrategy,
    },
    '/metrics/total-avs': { get: getTotalAvsMetric },
    '/metrics/total-operators': { get: getTotalOperatorsMetric },
    '/metrics/total-stakers': { get: getTotalStakerssMetric },
    '/metrics/total-withdrawals': { get: getTotalWithdrawals },
    '/metrics/total-deposits': { get: getTotalDeposits },
    '/metrics/deployment-ratio': { get: getDeploymentRatio },
    '/metrics/restaking-ratio': { get: getRestakingRatio },
};