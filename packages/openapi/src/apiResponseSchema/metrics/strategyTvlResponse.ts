import z from '../../../../api/src/schema/zod';

export const StrategyTvlSchema = z.object({
    strategyName: z
        .string()
        .describe('The name of the strategy')
        .openapi({ example: 'cbETH' }),
    strategyTvl: z
        .number()
        .describe('The total value locked in the strategy')
        .openapi({ example: 1000000 }),
});
