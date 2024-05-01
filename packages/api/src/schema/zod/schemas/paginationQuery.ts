import z from '../';

export const PaginationQuerySchema = z.object({
    skip: z
        .string()
        .default('0')
        .refine((val) => !isNaN(parseInt(val, 10)), {
            message: 'Skip must be a valid integer',
        })
        .transform((val) => (val ? parseInt(val, 10) : 0))
        .describe('The number of records to skip for pagination')
        .openapi({ example: 0 }),
    take: z
        .string()
        .default('12')
        .refine((val) => !isNaN(parseInt(val, 10)), {
            message: 'Take must be a valid integer',
        })
        .transform((val) => (val ? parseInt(val, 10) : 12))
        .describe('The number of records to return for pagination')
        .openapi({ example: 12 }),
});
