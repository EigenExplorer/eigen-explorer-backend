import z from '../../../../api/src/schema/zod';

export const DepositHistoricCountSchema = z.object({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding AVS deposits count ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    value: z
        .number()
        .describe('The total number of AVS deposits ')
        .openapi({ example: 10 }),
})
