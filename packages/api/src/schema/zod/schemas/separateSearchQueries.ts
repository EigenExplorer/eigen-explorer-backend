import z from '..'

export const SearchMode = z.object({
    searchMode: z
        .enum(['contains', 'startsWith'])
        .optional()
        .default('contains')
        .describe('Search mode')
        .openapi({ example: 'contains' }),
})

export const SearchByText = z.object({
    searchByText: z
        .string()
        .optional()
        .describe('Case-insensitive search query')
        .openapi({ example: 'blockless' })
})
