import z from '..'

export const WithTvlQuerySchema = z
	.object({
		withTvl: z
			.enum(['true', 'false'])
			.default('false')
			.describe('Toggle whether the route should calculate the TVL from shares')
			.transform((val) => val === 'true')
			.openapi({ example: 'false' }),
		sortByTotalStakers: z
			.enum(['asc', 'desc'])
			.optional()
			.describe('Sort results in asc or desc order of total stakers')
			.openapi({ example: 'desc' }),
		sortByTotalAvs: z
			.enum(['asc', 'desc'])
			.optional()
			.describe(
				'Sort results in asc or desc order of total AVS (only valid for Operator queries)'
			)
			.openapi({ example: 'desc' }),
		sortByTotalOperators: z
			.enum(['asc', 'desc'])
			.optional()
			.describe(
				'Sort results in asc or desc order of total AVS (only valid for AVS queries)'
			)
			.openapi({ example: 'desc' })
	})
	.refine(
		(data) => {
			const sortByFields = [
				data.sortByTotalStakers,
				data.sortByTotalAvs,
				data.sortByTotalOperators
			].filter((field) => field !== undefined)
			return sortByFields.length <= 1
		},
		{
			message: 'Only one sortBy option can be used',
			path: [
				'sortByTotalStakers',
				'sortByTotalAvs',
				'sortByTotalOperators'
			]
		}
	)
