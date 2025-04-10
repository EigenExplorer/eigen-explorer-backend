import z from '../'
import { EthereumAddressSchema } from './base/ethereumAddress'

export const UpdateMetadataSchema = z.object({
	metadataName: z.string().nullable(),
	metadataDescription: z.string().nullable(),
	metadataDiscord: z.string().nullable(),
	metadataLogo: z.string().nullable(),
	metadataTelegram: z.string().nullable(),
	metadataWebsite: z.string().nullable(),
	metadataX: z.string().nullable(),
	metadataGithub: z.string().nullable(),
	metadataTokenAddress: EthereumAddressSchema.nullable(),
	additionalConfig: z.record(z.string(), z.string()).nullable(),
	tags: z.array(z.string()).nullable(),
	isVisible: z.boolean().nullable(),
	isVerified: z.boolean().nullable()
})
