import z from '..'

export const WithAdditionalDataQuery = z.object({
	withAvsData: z
		.enum(['true', 'false'])
		.default('false')
		.describe(
			'Toggle whether to return additional data for each AVS registration for a given Operator'
		)
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})
