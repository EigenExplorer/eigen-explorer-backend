import z from '../';

const AvsMetadataSchema = z.object({
    name: z
        .string()
        .describe('The name of the AVS')
        .openapi({ example: 'Example AVS' }),
    description: z
        .string()
        .nullable()
        .describe('The description of the AVS')
        .openapi({ example: 'This is an example AVS' }),
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
    .describe('The AVS service manager contract address')
    .openapi({ example: '0x74b09c5de70ebadbeeb5db503fecb6e6ad39560d' });

export const AvsSchema = z.object({
    metadata: AvsMetadataSchema,
    curatedMetadata: AvsMetadataSchema.nullable(),
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

export const AvsAddressSchema = z.object({
    name: z
        .string()
        .describe('The name of the AVS')
        .openapi({ example: 'Example AVS' }),
    address: EthereumAddressSchema,
});
