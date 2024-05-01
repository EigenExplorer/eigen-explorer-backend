import z from '../../../../api/src/schema/zod';

const StrategyTvl = z
    .number()
    .describe('The total value locked in the strategy')
    .openapi({ example: 1000000 });

const StrategyName = z
    .string()
    .describe('The name of the strategy')
    .openapi({ example: 'cbETH' });

export const StrategyTvlSchema = z
    .record(StrategyName, StrategyTvl)
    .describe('The total value locked in each restaking strategy')
    .openapi({
        example: {
            cbETH: 1000000,
            stETH: 2000000,
        },
    });
