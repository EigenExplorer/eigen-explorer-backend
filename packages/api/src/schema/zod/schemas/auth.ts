import z from '..'

const RecordSchema = z.object({
	apiTokens: z.array(z.string()),
	accessLevel: z.number()
})

export const UpdateCacheQuerySchema = z.object({
	type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
	record: RecordSchema.nullable(),
	old_record: RecordSchema.nullable()
})

export const RefreshCacheQuerySchema = z.object({
	data: z.array(
		z.object({
			apiTokens: z.array(z.string()),
			accessLevel: z.number()
		})
	)
})
