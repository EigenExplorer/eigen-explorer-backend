import z from '..'

export const SortByQuerySchema = z
	.object({
		sortByTvl: z
			.enum(['asc', 'desc'])
			.optional()
			.describe('Sort results in asc or desc order of TVL value')
			.openapi({ example: 'desc' }),
		sortByTotalStakers: z
			.enum(['asc', 'desc'])
			.optional()
			.describe('Sort results in asc or desc order of total stakers')
			.openapi({ example: 'desc' }),
		sortByTotalAvs: z
			.enum(['asc', 'desc'])
			.optional()
			.describe('Sort results in asc or desc order of total AVS (only valid for Operator queries)')
			.openapi({ example: 'desc' }),
		sortByApy: z
			.enum(['asc', 'desc'])
			.optional()
			.describe('Sort results in asc or desc order of APY')
			.openapi({ example: 'desc' }),
		sortByTotalOperators: z
			.enum(['asc', 'desc'])
			.optional()
			.describe('Sort results in asc or desc order of total AVS (only valid for AVS queries)')
			.openapi({ example: 'desc' }),
		sortOperatorsByTvl: z
			.enum(['asc', 'desc'])
			.optional()
			.describe(
				'Sort Operators of a given AVS in asc or desc order of TVL (only valid for individual AVS queries)'
			)
			.openapi({ example: 'desc' })
	})
	.refine(
		(data) => {
			const sortByFields = [
				data.sortByTvl,
				data.sortByTotalStakers,
				data.sortByTotalAvs,
				data.sortByTotalOperators
			].filter((field) => field !== undefined)
			return sortByFields.length <= 1
		},
		{
			message: 'Only one sortBy option can be used',
			path: ['sortByTvl', 'sortByTotalStakers', 'sortByTotalAvs', 'sortByTotalOperators']
		}
	)
