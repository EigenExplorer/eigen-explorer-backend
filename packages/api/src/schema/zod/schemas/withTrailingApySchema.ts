import z from '..'

export const WithTrailingApySchema = z.object({
	withTrailingApy: z
		.enum(['true', 'false'])
		.default('false')
		.describe('Toggle whether the route should calculate the Trailing APY Values')
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})
