import z from '../'
import { EthereumAddressSchema } from './base/ethereumAddress'

export const UpdateMetadataSchema = z.object({
	metadataName: z.string(),
	metadataDescription: z.string(),
	metadataDiscord: z.string(),
	metadataLogo: z.string(),
	metadataTelegram: z.string(),
	metadataWebsite: z.string(),
	metadataX: z.string(),
	metadataGithub: z.string(),
	metadataTokenAddress: EthereumAddressSchema,
	additionalConfig: z.record(z.string(), z.string()),
	tags: z.array(z.string()),
	isVisible: z.boolean(),
	isVerified: z.boolean()
})
