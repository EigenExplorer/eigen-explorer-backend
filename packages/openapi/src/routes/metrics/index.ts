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
import { getHistoricalAvsCount } from './getHistoricalAvsCount';
import { getHistoricalOperatorCount } from './getHistoricalOperatorCount';
import { getHistoricalDepositCount } from './getHistoricalDepositCount';
import { getHistoricalStakerCount } from './getHistoricalStakerCount';
import { getHistoricalWithdrawalCount } from './getHistoricalWithdrawalCount';
import { getHistoricalAvsAggregate } from './getHistoricalAvsAggregate';
import { getHistoricalOperatorsAggregate } from './getHistoricalOperatorsAggregate';

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
    '/metrics//historical/avs/{address}': { get: getHistoricalAvsAggregate },
    '/metrics//historical/operators/{address}': { get: getHistoricalOperatorsAggregate },
    '/metrics/historical/count-avs': { get: getHistoricalAvsCount },
    '/metrics/historical/count-operators': { get: getHistoricalOperatorCount },
    '/metrics/historical/count-stakers': { get: getHistoricalStakerCount },
    '/metrics/historical/count-withdrawals': { get: getHistoricalWithdrawalCount },
    '/metrics/historical/count-deposits': { get: getHistoricalDepositCount },
};