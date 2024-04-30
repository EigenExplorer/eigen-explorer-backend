import z from '../../../api/src/schema/zod';
import { AvsMetaDataSchema } from '../../../api/src/schema/zod/schemas/base/avsMetaData';
import { EthereumAddressSchema } from '../../../api/src/schema/zod/schemas/base/ethereumAddress';
import { StrategySharesSchema } from '../../../api/src/schema/zod/schemas/base/strategyShares';

export const AvsDetailsSchema = z.object({
    address: EthereumAddressSchema.describe(
        'AVS service manager contract address'
    ).openapi({ example: '0x35f4f28a8d3ff20eed10e087e8f96ea2641e6aa1' }),
    tags: z
        .array(z.string())
        .optional()
        .describe('The tags associated with the AVS')
        .openapi({ example: ['DA', 'DeFi'] }),
    metadataName: AvsMetaDataSchema.shape.metadataName,
    metadataDescription: AvsMetaDataSchema.shape.metadataDescription,
    metadataDiscord: AvsMetaDataSchema.shape.metadataDiscord,
    metadataLogo: AvsMetaDataSchema.shape.metadataLogo,
    metadataTelegram: AvsMetaDataSchema.shape.metadataTelegram,
    metadataWebsite: AvsMetaDataSchema.shape.metadataWebsite,
    metadataX: AvsMetaDataSchema.shape.metadataX,
    isVisible: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the AVS is visible on the EigenExplorer UI')
        .openapi({ example: true }),
    isverified: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the AVS has gone through manual verification')
        .openapi({ example: true }),
    shares: z
        .array(StrategySharesSchema)
        .optional()
        .describe('The strategy shares held in the AVS'),
    tvl: z
        .number()
        .describe('The total value locked in the AVS')
        .openapi({ example: 1000000 }),
    totalOperators: z
        .number()
        .describe('The total number of operators operating the AVS')
        .openapi({ example: 10 }),
    totalStakers: z
        .number()
        .describe('The total number of stakers staking in the AVS')
        .openapi({ example: 10 }),
});

export const AllAvsSchema = z.object({
    address: EthereumAddressSchema.describe(
        'AVS service manager contract address'
    ).openapi({ example: '0x35f4f28a8d3ff20eed10e087e8f96ea2641e6aa1' }),
    tags: z
        .array(z.string())
        .optional()
        .describe('The tags associated with the AVS')
        .openapi({ example: ['DA', 'DeFi'] }),
    metadataName: AvsMetaDataSchema.shape.metadataName,
    metadataDescription: AvsMetaDataSchema.shape.metadataDescription,
    metadataDiscord: AvsMetaDataSchema.shape.metadataDiscord,
    metadataLogo: AvsMetaDataSchema.shape.metadataLogo,
    metadataTelegram: AvsMetaDataSchema.shape.metadataTelegram,
    metadataWebsite: AvsMetaDataSchema.shape.metadataWebsite,
    metadataX: AvsMetaDataSchema.shape.metadataX,
    isVisible: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the AVS is visible on the EigenExplorer UI')
        .openapi({ example: true }),
    isverified: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the AVS has gone through manual verification')
        .openapi({ example: true }),
    tvl: z
        .number()
        .describe('The total value locked in the AVS')
        .openapi({ example: 1000000 }),
    totalOperators: z
        .number()
        .describe('The total number of operators operating the AVS')
        .openapi({ example: 10 }),
    totalStakers: z
        .number()
        .describe('The total number of stakers staking in the AVS')
        .openapi({ example: 10 }),
});
