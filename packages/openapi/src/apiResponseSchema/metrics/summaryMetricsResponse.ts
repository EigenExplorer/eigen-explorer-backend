import z from '../../../../api/src/schema/zod';
import {
    StrategyEthTvlSchema,
    StrategyTvlSchema,
} from '../base/strategyTvlResponse';
import { TotalAvsSchema, TotalOperatorsSchema, TotalStakersSchema } from './timeChangeResponse';

export const SummaryMetricsResponseSchema = z.object({
    tvl: z
        .number()
        .describe(
            'The total value locked (TVL) in ETH in the EigenLayer ecosystem'
        )
        .openapi({ example: 1000000 }),
    tvlRestaking: z
        .number()
        .describe(
            'The total value locked (TVL) in ETH in all restaking strategies'
        )
        .openapi({ example: 1000000 }),
    tvlStrategies: StrategyTvlSchema,
    tvlStrategiesEth: StrategyEthTvlSchema,
    tvlBeaconChain: z
        .number()
        .describe(
            'The total value locked (TVL) in ETH in the beacon chain ETH strategy'
        )
        .openapi({ example: 1000000 }),
    totalAVS: TotalAvsSchema,
    totalOperators: TotalOperatorsSchema,
    totalStakers: TotalStakersSchema
});
