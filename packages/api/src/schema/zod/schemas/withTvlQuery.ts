import z from '..'

export const WithTvlQuerySchema = z.object({
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
	.openapi({ example: 'desc' })
}).refine(
	(data) => {
	  if (data.sortByTvl !== undefined) {
		return data.withTvl === true
	  }
	  return true
	},
	{
	  message: "sortByTvl can only be used when withTvl is true",
	  path: ['sortByTvl']
	}
)
