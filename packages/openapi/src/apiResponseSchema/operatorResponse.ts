import z from '../../../api/src/schema/zod';
import { OperatorMetaDataSchema } from '../../../api/src/schema/zod/schemas/base/operatorMetaData';
import { EthereumAddressSchema } from '../../../api/src/schema/zod/schemas/base/ethereumAddress';

export const OperatorResponseSchema = z.object({
    address: EthereumAddressSchema.describe(
        'The contract address of the AVS operator'
    ).openapi({ example: '0x09e6eb09213bdd3698bd8afb43ec3cb0ecff683a' }),
    metadataName: OperatorMetaDataSchema.shape.metadataName,
    metadataDescription: OperatorMetaDataSchema.shape.metadataDescription,
    metadataDiscord: OperatorMetaDataSchema.shape.metadataDiscord,
    metadataLogo: OperatorMetaDataSchema.shape.metadataLogo,
    metadataTelegram: OperatorMetaDataSchema.shape.metadataTelegram,
    metadataWebsite: OperatorMetaDataSchema.shape.metadataWebsite,
    metadataX: OperatorMetaDataSchema.shape.metadataX,
    totalStakers: z
        .number()
        .describe('The total number of stakers opted into the AVS operator')
        .openapi({ example: 10 }),
    tvl: z
        .number()
        .describe('The total value locked in the AVS operator')
        .openapi({ example: 1000000 }),
});
