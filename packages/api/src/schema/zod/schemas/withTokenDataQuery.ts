import z from '..'

export const WithTokenDataQuerySchema = z.object({
	withTokenData: z
		.enum(['true', 'false'])
		.default('false')
		.describe(
			'Toggle whether the route should return underlying token address and underlying value'
		)
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})
