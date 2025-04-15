import z from '../'
import { EthereumAddressSchema } from './base/ethereumAddress'

export const UpdateMetadataSchema = z.object({
	metadataName: z.string().nullable().optional(),
	metadataDescription: z.string().nullable().optional(),
	metadataDiscord: z.string().nullable().optional(),
	metadataLogo: z.string().nullable().optional(),
	metadataTelegram: z.string().nullable().optional(),
	metadataWebsite: z.string().nullable().optional(),
	metadataX: z.string().nullable().optional(),
	metadataGithub: z.string().nullable().optional(),
	metadataTokenAddress: EthereumAddressSchema.nullable().optional(),
	additionalConfig: z.record(z.string(), z.string()).nullable().optional(),
	tags: z.array(z.string()).optional(),
	isVisible: z.boolean().optional(),
	isVerified: z.boolean().optional()
})
