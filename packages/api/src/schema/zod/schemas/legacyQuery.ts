import z from '../'

export const LegacyQuerySchema = z.object({
	legacy: z.enum(['true', 'false']).default('true').openapi({ example: 'false' })
})
