import z from '..'

export const SortByTotalAvs = z.object({
	sortByTotalAvs: z
		.enum(['asc', 'desc'])
		.optional()
		.describe(
			'Sort results in asc or desc order of total AVS (only valid for Operator queries)'
		)
		.openapi({ example: 'desc' })
})

export const SortByTotalOperators = z.object({
	sortByTotalOperators: z
		.enum(['asc', 'desc'])
		.optional()
		.describe(
			'Sort results in asc or desc order of total AVS (only valid for AVS queries)'
		)
		.openapi({ example: 'desc' })
})

export const SortByTotalStakers = z.object({
	sortByTotalStakers: z
		.enum(['asc', 'desc'])
		.optional()
		.describe('Sort results in asc or desc order of total stakers')
		.openapi({ example: 'desc' })
})
