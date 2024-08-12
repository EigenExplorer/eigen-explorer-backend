import z from '../../../../api/src/schema/zod';

export const TvlResponseSchema = z.object({
    tvl: z.number().openapi({ example: 1000000 }),
});

export const TotalTvlResponseSchema = TvlResponseSchema.extend({
    tvl: z
        .number()
        .describe('The value of the combined TVL in ETH')
        .openapi({ example: 1000000 }),
});

export const BeaconChainTvlResponseSchema = TvlResponseSchema.extend({
    tvl: z
        .number()
        .describe('The value of the Beacon Chain restaking TVL in ETH')
        .openapi({ example: 1000000 }),
});

export const IndividualStrategyTvlResponseSchema = TvlResponseSchema.extend({
    tvl: z
        .number()
        .describe(
            "The value of the restaking strategy TVL, denominated in the strategy's native token"
        )
        .openapi({ example: 1000000 }),
    tvlEth: z
        .number()
        .describe(
            "The value of the restaking strategy TVL, denominated in Eth"
        )
        .openapi({ example: 1000000 }),
});

export const HistoricalTvlResponseSchema = z.object({
    timestamp: z.string().openapi({ example: '2024-04-11T08:31:11.000Z' }),
    tvlEth: z.number().openapi({ example: 1000000 }),
});

export const HistoricalTotalTvlResponseSchema = HistoricalTvlResponseSchema.extend({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding TVL value ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    tvlEth: z
        .number()
        .describe('The value of the combined TVL in ETH')
        .openapi({ example: 1000000 }),
});

export const HistoricalBeaconChainTvlResponseSchema = HistoricalTvlResponseSchema.extend({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding Beacon Chain TVL value ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    tvlEth: z
        .number()
        .describe('The value of the Beacon Chain restaking TVL in ETH')
        .openapi({ example: 1000000 }),
});

export const HistoricalIndividualStrategyTvlResponseSchema = HistoricalTvlResponseSchema.extend({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding Beacon Chain TVL value ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    tvlEth: z
        .number()
        .describe(
            "The value of the restaking strategy TVL, denominated in ETH"
        )
        .openapi({ example: 1000000 }),
});


