import z from '..'

export const WithRewardsQuerySchema = z.object({
	withRewards: z
		.enum(['true', 'false'])
		.default('false')
		.describe(
			'Toggle whether the route should return Avs/Operator rewards APY data'
		)
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})
