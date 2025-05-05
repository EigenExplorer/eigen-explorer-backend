import z from '..'

export const WithTvlQuerySchema = z.object({
	withTvl: z
		.enum(['true', 'false'])
		.default('false')
		.describe('Toggle whether the route should calculate the TVL from shares')
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})

export const WithTrailingApySchema = z.object({
	withTrailingAPY: z
		.enum(['true', 'false'])
		.default('false')
		.describe('')
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})
