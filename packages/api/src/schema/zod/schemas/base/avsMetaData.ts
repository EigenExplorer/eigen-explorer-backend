import z from '../..'

export const AvsMetaDataSchema = z.object({
	metadataName: z.string().describe('The name of the AVS').openapi({ example: 'Example AVS' }),
	metadataDescription: z
		.string()
		.nullable()
		.describe('The description of the AVS')
		.openapi({ example: 'This is an example AVS' }),
	metadataDiscord: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS's Discord server")
		.openapi({ example: 'https://discord.com/invite/abcdefghij' }),
	metadataLogo: z.string().url().nullable().describe("The URL of the AVS's logo"),
	metadataTelegram: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS's Telegram channel")
		.openapi({ example: 'https://t.me/acme' }),
	metadataWebsite: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS's website")
		.openapi({ example: 'https://acme.com' }),
	metadataX: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS's X")
		.openapi({ example: 'https://twitter.com/acme' }),
	metadataGithub: z
		.string()
		.url()
		.nullable()
		.describe("The URL of the AVS's Github")
		.openapi({ example: 'https://github.com/acme' }),
	metadataTokenAddress: z
		.string()
		.url()
		.nullable()
		.describe('The Token Address of the AVS')
		.openapi({ example: '0x2344c0fe02ccd2b32155ca0ffcb1978a6d96a552' })
})
