import z from '..'

export const UpdateCacheQuerySchema = z.object({
	action: z.enum(['write', 'delete']),
	apiToken: z.string(),
	accessLevel: z.number()
})

export const RefreshCacheQuerySchema = z.object({
	data: z.array(
		z.object({
			apiToken: z.string(),
			accessLevel: z.number()
		})
	)
})
