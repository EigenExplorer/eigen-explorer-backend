import z from '../../../../api/src/schema/zod';

const Change24HoursResponseSchema = z.object({
    value: z.number().openapi({ example: 10 }),
    percent: z.number().openapi({ example: 0.01})
});

const Change7DaysResponseSchema = z.object({
    value: z.number().openapi({ example: 10 }),
    percent: z.number().openapi({ example: 0.01 })
});

export const TotalAvsSchema = z.object({
    totalAvs: z
        .number()
        .describe('The total number of AVS registered')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const TotalOperatorsSchema = z.object({
    totalOperators: z
        .number()
        .describe('The total number of AVS operators registered')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const TotalStakersSchema = z.object({
    totalStakers: z
        .number()
        .describe('The total number of AVS stakers registered')
        .openapi({ example: 1000000 }),
        change24h:Change24HoursResponseSchema,
        change7d:Change7DaysResponseSchema
});

export const TotalDepositsSchema = z.object({
    totalDeposits: z
        .number()
        .describe('The total number of deposits')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const TotalWithdrawlsSchema = z.object({
    totalWithdrawls: z
        .number()
        .describe('The total number of withdrawls')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});