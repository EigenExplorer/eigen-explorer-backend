import z from '..'

export const WithTvlQuerySchema = z
	.object({
		withTvl: z
			.enum(['true', 'false'])
			.default('false')
			.describe('Toggle whether the route should calculate the TVL from shares')
			.transform((val) => val === 'true')
			.openapi({ example: 'false' }),
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
			if (
				data.sortByTvl !== undefined ||
				data.sortByTotalStakers !== undefined ||
				data.sortByTotalAvs !== undefined ||
				data.sortByTotalOperators !== undefined
			) {
				return data.withTvl === true
			}
			return true
		},
		{
			message: 'sortBy can only be used when withTvl is true',
			path: ['withTvl']
		}
	)
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
			path: [
				'sortByTvl',
				'sortByTotalStakers',
				'sortByTotalAvs',
				'sortByTotalOperators'
			]
		}
	)
