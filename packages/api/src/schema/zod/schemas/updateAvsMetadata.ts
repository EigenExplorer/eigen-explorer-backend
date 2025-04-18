import z from '..'

export const AvsAdditionalInfoItem = z.object({
	metadataKey: z.string(),
	metadataContent: z.string().nullable()
})

export const AvsAdditionalInfo = z.array(AvsAdditionalInfoItem)
