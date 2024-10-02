import z from '..'

export const RewardsQuerySchema = z.object({
	apy: z
		.enum(['true', 'false'])
		.default('false')
		.describe(
			'Toggle whether the route should return Avs/Operator rewards APY data'
		)
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})
