import z from '../../../../api/src/schema/zod';

export const HistoricalCountSchema = z.object({
    timestamp: z
        .string()
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    value: z
        .number()
        .openapi({ example: 10 }),
});

export const AvsHistoricalCountSchema = HistoricalCountSchema.extend({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding AVS count ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    value: z
        .number()
        .describe('The total number of AVS registered ')
        .openapi({ example: 10 }),
})

export const DepositHistoricalCountSchema = HistoricalCountSchema.extend({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding deposits count ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    value: z
        .number()
        .describe('The total number of deposits made ')
        .openapi({ example: 10 }),
})

export const OperatorHistoricalCountSchema = HistoricalCountSchema.extend({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding AVS operators count ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    value: z
        .number()
        .describe('The total number of AVS operators registered ')
        .openapi({ example: 10 }),
})

export const StakerHistoricalCountSchema = z.object({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding AVS stakers count ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    value: z
        .number()
        .describe('The total number of AVS stakers registered ')
        .openapi({ example: 10 }),
})

export const WithdrawalHistoricalCountSchema = HistoricalCountSchema.extend({
    timestamp: z
        .string()
        .describe('The time stamp for the corresponding withdrawals count ')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    value: z
        .number()
        .describe('The total number of withdrawals made')
        .openapi({ example: 10 }),
})