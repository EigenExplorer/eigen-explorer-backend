import z from '../../../../api/src/schema/zod';
import { EthereumAddressSchema } from "../../../../api/src/schema/zod/schemas/base/ethereumAddress";
import { OperatorMetaDataSchema } from "../../../../api/src/schema/zod/schemas/base/operatorMetaData";
import { StrategySharesSchema } from '../../../../api/src/schema/zod/schemas/base/strategyShares';
import { TvlSchema } from '../base/tvlResponses';

export const AvsOperatorResponseSchema = z.object({
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
    createdAtBlock: z
        .string()
        .describe('The block number at which the AVS Operator was registered')
        .openapi({ example: '19631203' }),
    updatedAtBlock: z
        .string()
        .describe('The block number at which the AVS Operator registration was last updated')
        .openapi({ example: '19631203' }),
    createdAt: z
        .string()
        .describe('The time stamp at which the AVS Operator was registered')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    updatedAt: z
        .string()
        .describe('The time stamp at which the AVS Operator registration was last updated')
        .openapi({ example: '2024-04-11T08:31:11.000Z' }),
    shares: z
        .array(StrategySharesSchema)
        .describe('The strategy shares held in the AVS operator')
        .openapi({
            example: [
                {
                    strategyAddress:
                        '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
                    shares: '135064894598947935263152',
                },
                {
                    strategyAddress:
                        '0x54945180db7943c0ed0fee7edab2bd24620256bc',
                    shares: '9323641881708650182301',
                },
            ],
        }),
    restakedStrategies: z
        .array(EthereumAddressSchema)
        .describe('The list of restaked strategies')
        .openapi({ example: ['0x35f4f28a8d3ff20eed10e087e8f96ea2641e6aa1'] }),
    totalStakers: z
        .number()
        .describe('The total number of stakers who have delegated to this AVS operator')
        .openapi({ example: 10 }),
    tvl: TvlSchema.optional()
        .describe('The total value locked (TVL) in the AVS operator')
        .openapi({
            example: {
                tvl: 1000000,
                tvlBeaconChain: 1000000,
                tvlWETH: 1000000,
                tvlRestaking: 1000000,
                tvlStrategies: {
                    Eigen: 1000000,
                    cbETH: 2000000,
                },
                tvlStrategiesEth: {
                    stETH: 1000000,
                    cbETH: 2000000,
                },
            },
        }),
});
