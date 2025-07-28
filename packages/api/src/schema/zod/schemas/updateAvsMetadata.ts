import z from '..'

export const defaultAvsFields = [
	'metadataName',
	'metadataDescription',
	'metadataDiscord',
	'metadataLogo',
	'metadataTelegram',
	'metadataWebsite',
	'metadataX',
	'metadataGithub',
	'metadataTokenAddress'
]

export const AvsAdditionalInfoSchema = z.object({
	items: z.array(
		z.union([
			// For storing strings
			z.object({
				contentType: z.literal('application/json'),
				metadataKey: z
					.string()
					.min(1, 'metadataKey cannot be empty')
					.refine((key) => !defaultAvsFields.includes(key), {
						message: `metadataKey cannot be one of the reserved fields: ${defaultAvsFields.join(
							', '
						)}`
					}),
				metadataContent: z.string().nullable()
			}),
			// For storing image media
			z.object({
				contentType: z.string().refine((contentType) => contentType.startsWith('image/'), {
					message: 'Content-Type must be an image format'
				}),
				metadataKey: z.string().min(1, 'metadataKey cannot be empty'),
				fileData: z.string().refine(
					(str) => {
						try {
							// base64 validation
							const base64String = str.replace(/^data:image\/\w+;base64,/, '')
							return /^[A-Za-z0-9+/]*={0,2}$/.test(base64String)
						} catch {
							return false
						}
					},
					{ message: 'fileData must be a valid base64 string' }
				)
			})
		])
	)
})

export const AvsAdditionalInfoKeys = z.array(
	z
		.string()
		.min(1, 'metadataKeys cannot be empty')
		.refine((key) => !defaultAvsFields.includes(key), {
			message: `metadataKey cannot be one of the reserved fields: ${defaultAvsFields.join(', ')}`
		})
)
