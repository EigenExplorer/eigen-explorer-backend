import z from '../../../../api/src/schema/zod';
import { StrategyTvlSchema } from './strategyTvlResponse';

export const SummaryMetricsResponseSchema = z.object({
    tvl: z
        .number()
        .describe('The total value locked in all EigenLayer AVS')
        .openapi({ example: 10 }),
    tvlRestaking: z
        .number()
        .describe('The total value locked in all restaking strategies')
        .openapi({ example: 5 }),
    tvlStrategies: StrategyTvlSchema,
    tvlBeaconChain: z
        .number()
        .describe('The total value locked in the beacon chain ETH strategy')
        .openapi({ example: 1000000 }),
    totalAVS: z
        .number()
        .describe('The total number of AVS')
        .openapi({ example: 10 }),
    totalOperators: z
        .number()
        .describe('The total number of operators')
        .openapi({ example: 10 }),
    totalStakers: z
        .number()
        .describe('The total number of stakers')
        .openapi({ example: 10 }),
});
