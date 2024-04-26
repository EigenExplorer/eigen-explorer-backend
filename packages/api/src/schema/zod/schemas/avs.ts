import z from '../';

const MetadataSchema = z.object({
    name: z.string(),
    description: z.string().nullable(),
    discord: z
        .string()
        .url()
        .nullable()
        .describe("The URL of the AVS's Discord server")
        .openapi({ example: 'https://discord.com/invite/9eeRHxSCTZ' }),
    logo: z.string().url().nullable().describe("The URL of the AVS's logo"),
    telegram: z
        .string()
        .url()
        .nullable()
        .describe("The URL of the AVS's Telegram channel")
        .openapi({ example: 'https://t.me/acme' }),
    website: z
        .string()
        .url()
        .nullable()
        .describe("The URL of the AVS's website")
        .openapi({ example: 'https://acme.com' }),
    x: z
        .string()
        .url()
        .nullable()
        .describe("The URL of the AVS's X")
        .openapi({ example: 'https://twitter.com/acme' }),
});

export const EthereumAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
    .describe("The AVS's service manager address")
    .openapi({ example: '0x74b09c5de70ebadbeeb5db503fecb6e6ad39560d' });

const schema = z.object({
    metadata: MetadataSchema,
    curatedMetadata: MetadataSchema.nullable(),
    id: z.string().openapi({ example: '66218ccb560e53b6760df00d' }),
    address: EthereumAddressSchema,
    tags: z
        .array(z.string())
        .describe('A list of tags associated with the AVS')
        .openapi({ example: ['DA'] }),
    isVisible: z.boolean().openapi({ example: true }),
    isVerified: z
        .boolean()
        .describe('Whether the AVS is manually verified')
        .openapi({ example: true }),
    totalOperators: z
        .number()
        .nonnegative()
        .describe('The total number of operators')
        .openapi({ example: 1 }),
    totalStakers: z
        .number()
        .nonnegative()
        .describe('The total number of stakers')
        .openapi({ example: 1 }),
});

export default schema;
