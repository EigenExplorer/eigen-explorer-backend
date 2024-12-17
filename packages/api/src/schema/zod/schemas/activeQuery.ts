import z from '../'

export const ActiveQuerySchema = z.object({
	active: z
		.enum(['true', 'false'])
		.optional()
		.describe('Fetch only those stakers with shares > 0')
		.openapi({ example: 'true' })
})
