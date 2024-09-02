import z from '../';

export const ByTextSearchQuerySchema = z.object({
    byTextSearch: z
        .string()
        .optional()
        .describe('Case-insensitive search query')
        .openapi({ example: 'blockless' })
})