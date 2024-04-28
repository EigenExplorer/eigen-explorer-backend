import z from '../';

const MetadataSchema = z.object({
    name: z
        .string()
        .describe('The name of the AVS operator')
        .openapi({ example: 'Example AVS operator' }),
    description: z
        .string()
        .nullable()
        .describe('The description of the AVS operator')
        .openapi({ example: 'This is an example AVS operator.' }),
    discord: z
        .string()
        .url()
        .nullable()
        .describe("The URL of the AVS operator's Discord server")
        .openapi({ example: 'https://discord.com/invite/9eeRHxSCTZ' }),
    logo: z
        .string()
        .url()
        .nullable()
        .describe("The URL of the AVS operator's logo"),
    telegram: z
        .string()
        .url()
        .nullable()
        .describe("The URL of the AVS's Telegram channel")
        .openapi({ example: 'https://t.me/acme' }),
    website: z.string().url(),
    x: z.string().url(),
});

const ShareSchema = z.object({
    shares: z.string(),
    strategy: z.string(),
});

const SharesSchema = z.array(ShareSchema);

const DataSchema = z.object({
    metadata: MetadataSchema,
    curatedMetadata: z.nullable(z.unknown()),
    shares: SharesSchema,
    id: z.string(),
    address: z.string(),
    totalStakers: z.number(),
    tvl: z.number(),
});

export default DataSchema;
