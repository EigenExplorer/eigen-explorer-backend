import z from '../..'

export const OperatorMetaDataSchema = z.object({
	metadataName: z
		.string()
		.describe('The name of the AVS operator')
		.openapi({ example: 'Example AVS Operator' }),
	metadataDescription: z
		.string()
		.nullable()
		.describe('The description of the AVS operator')
		.openapi({ example: 'This is an example AVS operator' }),
	metadataDiscord: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS operator's Discord server")
		.openapi({ example: 'https://discord.com/invite/abcdefghij' }),
	metadataLogo: z.string().url().nullable().describe("The URL of the AVS operator's logo"),
	metadataTelegram: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS operator's Telegram channel")
		.openapi({ example: 'https://t.me/acme' }),
	metadataWebsite: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS operator's website")
		.openapi({ example: 'https://acme.com' }),
	metadataX: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS operator's X")
		.openapi({ example: 'https://twitter.com/acme' })
})
