import z from '../../../../api/src/schema/zod'

const createChangeSchema = (description: string, exampleValue: number, examplePercent: number) =>
    z.object({
        value: z
            .number()
            .describe(`The absolute change in the value over the past ${description}`)
            .openapi({ example: exampleValue }),
        percent: z
            .number()
            .describe(`The percentage change in the value over the past ${description}`)
            .openapi({ example: examplePercent }),
    })

export const Change24HoursResponseSchema = createChangeSchema('24 hours', 10, 0.01)
export const Change7DaysResponseSchema = createChangeSchema('7 days', 10, 0.01)

const createTotalSchema = (description: string, example: number) =>
    z.object({
        total: z
            .number()
            .describe(`The total number of ${description} registered`)
            .openapi({ example }),
        change24h: Change24HoursResponseSchema.optional(),
        change7d: Change7DaysResponseSchema.optional(),
    })

export const TotalAvsSchema = createTotalSchema('AVS', 1000000)
export const TotalOperatorsSchema = createTotalSchema('AVS operators', 1000000)
export const TotalStakersSchema = createTotalSchema('AVS stakers', 1000000)

export const TotalDepositsSchema = z.object({
    total: z
        .number()
        .describe('The total number of deposits')
        .openapi({ example: 1000000 }),
    change24h: Change24HoursResponseSchema.optional(),
    change7d: Change7DaysResponseSchema.optional(),
})

export const TotalWithdrawalsSchema = z.object({
    total: z
        .number()
        .describe('The total number of withdrawals')
        .openapi({ example: 1000000 }),
    pending: z
        .number()
        .describe('The pending number of withdrawals')
        .openapi({ example: 1000000 }),
    completed: z
        .number()
        .describe('The completed number of withdrawals')
        .openapi({ example: 1000000 }),
    change24h: Change24HoursResponseSchema.optional(),
    change7d: Change7DaysResponseSchema.optional(),
})
