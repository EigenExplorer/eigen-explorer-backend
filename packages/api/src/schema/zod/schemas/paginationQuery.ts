import z from '../';

export const PaginationQuerySchema = z.object({
    skip: z
        .number()
        .min(0)
        .default(0)
        .describe('The number of records to skip for pagination.')
        .openapi({ example: 0 }),
    take: z
        .number()
        .min(1)
        .default(12)
        .describe('The number of records to return for pagination.')
        .openapi({ example: 12 }),
});
