import z from '../../../../api/src/schema/zod';

const StrategyTvl = z
    .number()
    .describe(
        "The total value locked (TVL) in the strategy, denominated in the strategy's native token"
    )
    .openapi({ example: 1000000 });

const StrategyEthTvl = z
    .number()
    .describe(
        'The total value locked (TVL) in the strategy, denominated in ETH'
    )
    .openapi({ example: 1000000 });

const StrategyName = z
    .string()
    .describe('The name of the strategy')
    .openapi({ example: 'cbETH' });

export const StrategyTvlSchema = z
    .record(StrategyName, StrategyTvl)
    .describe(
        "The total value locked (TVL) in each restaking strategy, denominated in the strategy's native token"
    )
    .openapi({
        example: {
            cbETH: 1000000,
            stETH: 2000000,
        },
    });

export const StrategyEthTvlSchema = z
    .record(StrategyName, StrategyEthTvl)
    .describe(
        'The total value locked (TVL) in each restaking strategy, denominated in ETH'
    )
    .openapi({
        example: {
            cbETH: 1000000,
            stETH: 2000000,
        },
    });
