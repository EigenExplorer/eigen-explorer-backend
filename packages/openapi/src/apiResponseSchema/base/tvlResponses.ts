import z from '../../../../api/src/schema/zod';
import { StrategyTvlSchema } from './strategyTvlResponse';

export const TvlSchema = z.object({
    tvl: z
        .number()
        .describe('The combined TVL of all restaking strategies in ETH')
        .openapi({ example: 1000000 }),
    tvlBeaconChain: z
        .number()
        .describe('The TVL of Beacon Chain restaking strategy in ETH')
        .openapi({ example: 1000000 }),
    tvlRestaking: z
        .number()
        .describe('The combined TVL of all liquid restaking strategies in ETH')
        .openapi({ example: 1000000 }),
    tvlWETH: z
        .number()
        .describe('The TVL of WETH restaking strategy in ETH')
        .openapi({ example: 1000000 }),
    tvlStrategies: StrategyTvlSchema.describe(
        'The TVL of each individual restaking strategy in its native token'
    ).openapi({ example: { Eigen: 1000000, cbETH: 2000000 } }),
});
