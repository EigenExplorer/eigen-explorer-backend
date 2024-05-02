import z from '../../../../api/src/schema/zod';

export const TvlSchema = z.object({
    tvl: z
        .number()
        .describe('The combined TVL of all restaking strategies')
        .openapi({ example: 1000000 }),
    tvlRestaking: z
        .number()
        .describe('The combined TVL of all liquid restaking strategies')
        .openapi({ example: 1000000 }),
    tvlWETH: z
        .number()
        .describe('The TVL of WETH restaking strategy')
        .openapi({ example: 1000000 }),
    tvlBeaconChain: z
        .number()
        .describe('The combined TVL of Beacon Chain restaking strategy')
        .openapi({ example: 1000000 }),
});
