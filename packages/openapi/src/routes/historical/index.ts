import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getHistoricalAvsCount } from '../historical/getHistoricalAvsCount';
import { getHistoricalOperatorCount } from '../historical/getHistoricalOperatorCount';
import { getHistoricalDepositCount } from '../historical/getHistoricalDepositCount';
import { getHistoricalStakerCount } from '../historical/getHistoricalStakerCount';
import { getHistoricalWithdrawalCount } from '../historical/getHistoricalWithdrawalCount';
import { getHistoricalAvsAggregate } from '../historical/getHistoricalAvsAggregate';
import { getHistoricalOperatorsAggregate } from '../historical/getHistoricalOperatorsAggregate';
import { getHistoricalTvl } from '../historical/getHistoricalTvl';
import { getHistoricalTvlRestaking } from '../historical/getHistoricalTvlRestaking';
import { getHistoricalTvlBeaconChain } from '../historical/getHistoricalTvlBeaconChain';
import { getHistoricalDepositAggregate } from '../historical/getHistoricalDepositAggregate';
import { getHistoricalWithdrawalAggregate } from '../historical/getHistoricalWithdrawalAggregate';


export const historicalRoutes: ZodOpenApiPathsObject = {
    '/metrics/historical/avs/{address}': { get: getHistoricalAvsAggregate },
    '/metrics/historical/operators/{address}': { get: getHistoricalOperatorsAggregate },
    '/metrics/historical/tvl': { get: getHistoricalTvl },
    '/metrics/historical/tvl/beacon-chain': { get: getHistoricalTvlBeaconChain },
    '/metrics/historical/tvl/restaking/{address}': { get: getHistoricalTvlRestaking },
    '/metrics/historical/withdrawals': { get: getHistoricalWithdrawalAggregate },
    '/metrics/historical/deposits': { get: getHistoricalDepositAggregate },
    '/metrics/historical/count-avs': { get: getHistoricalAvsCount },
    '/metrics/historical/count-operators': { get: getHistoricalOperatorCount },
    '/metrics/historical/count-stakers': { get: getHistoricalStakerCount },
    '/metrics/historical/count-withdrawals': { get: getHistoricalWithdrawalCount },
    '/metrics/historical/count-deposits': { get: getHistoricalDepositCount },
};