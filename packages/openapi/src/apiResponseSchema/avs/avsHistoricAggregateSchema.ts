import z from '../../../../api/src/schema/zod';

export const AvsHistoricAggregateSchema = z.object({
    timestamp: z
        .string()
        .describe('The timestamp for the recorded data point')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    tvlEth: z
        .number()
        .describe('The total value locked (TVL) in ETH at the timestamp')
        .openapi({ example: 10 }),
    totalStakers: z
        .number()
        .describe('The total number of stakers at the timestamp')
        .openapi({ example: 10 }),
    totalOperators: z
        .number()
        .describe('The total number of operators at the timestamp')
        .openapi({ example: 10 }),
});
