import z from '..'

export const MinTvlQuerySchema = z.object({
	minTvl: z
		.string()
		.optional()
		.transform((val) => (val !== undefined ? Number(val) : undefined))
		.refine((val) => val === undefined || !isNaN(val), {
			message: 'minTvl must be a valid number'
		})
		.describe(
			'Return only the entities (Operators or AVS) having TVL (in ETH) greater than the specified value'
		)
		.openapi({ example: '0' })
})
