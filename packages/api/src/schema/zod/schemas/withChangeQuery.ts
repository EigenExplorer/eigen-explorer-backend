import z from '..'

export const WithChangeQuerySchema = z.object({
	withChange: z
		.enum(['true', 'false'])
		.default('false')
		.describe('Toggle whether the route should return 24h/7d change for TVL')
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})
