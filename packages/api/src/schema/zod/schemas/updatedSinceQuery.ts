import z from '../'

export const UpdatedSinceQuerySchema = z.object({
	updatedSince: z
		.string()
		.optional()
		.describe('Fetch stakers updated since this timestamp')
		.openapi({ example: '2024-04-11T08:31:11.000Z' })
})
