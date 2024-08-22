import z from '../../../../api/src/schema/zod';

export const Change24HoursResponseSchema = z.object({
    value: z.number().openapi({ example: 10 }),
    percent: z.number().openapi({ example: 0.01})
});

export const Change7DaysResponseSchema = z.object({
    value: z.number().openapi({ example: 10 }),
    percent: z.number().openapi({ example: 0.01 })
});

export const TotalAvsSchema = z.object({
    total: z
        .number()
        .describe('The total number of AVS registered')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const TotalOperatorsSchema = z.object({
    total: z
        .number()
        .describe('The total number of AVS operators registered')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const TotalStakersSchema = z.object({
    total: z
        .number()
        .describe('The total number of AVS stakers registered')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const TotalDepositsSchema = z.object({
    total: z
        .number()
        .describe('The total number of deposits')
        .openapi({ example: 1000000 })
});

export const TotalWithdrawalsSchema = z.object({
    total: z
        .number()
        .describe('The total number of withdrawals')
        .openapi({ example: 1000000 }),
    pending: z
        .number()
        .describe('The  pending number of withdrawals')
        .openapi({ example: 1000000 }),
    completed: z
        .number()
        .describe('The completed number of withdrawals')
        .openapi({ example: 1000000 }),
});