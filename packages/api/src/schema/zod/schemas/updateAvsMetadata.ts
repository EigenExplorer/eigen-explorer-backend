import z from '..'

export const AvsAdditionalInfoItemSchema = z.object({
	metadataKey: z.string(),
	metadataContent: z.string().nullable()
})

export const AvsAdditionalInfoSchema = z.array(AvsAdditionalInfoItemSchema)

export const AvsAdditionalInfoKeys = z.array(z.string())
