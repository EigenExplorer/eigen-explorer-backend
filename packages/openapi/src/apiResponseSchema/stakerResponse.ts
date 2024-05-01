import z from '../../../api/src/schema/zod';
import { EthereumAddressSchema } from '../../../api/src/schema/zod/schemas/base/ethereumAddress';

// {
//             "address": "0x0000006c21964af0d420af8992851a30fa13c68b",
//             "operatorAddress": "0x71c6f7ed8c2d4925d0baf16f6a85bb1736d412eb",
//             "shares": [
//                 {
//                     "stakerAddress": "0x0000006c21964af0d420af8992851a30fa13c68b",
//                     "strategyAddress": "0x93c4b944d05dfe6df7645a86cd2206016c51564d",
//                     "shares": "40888428658906049"
//                 }
//             ],
//             "tvl": 0.040888428658906045
//         },

export const StakerSharesSchema = z.object({
    stakerAddress: EthereumAddressSchema.describe(
        'The contract address of the staker'
    ).openapi({ example: '0x0000006c21964af0d420af8992851a30fa13c68a' }),
    strategyAddress: EthereumAddressSchema.describe(
        'The contract address of the restaking strategy'
    ).openapi({ example: '0x93c4b944d05dfe6df7645a86cd2206016c51564a' }),
    shares: z
        .string()
        .describe('The amount of shares held in the strategy')
        .openapi({ example: '40888428658906049' }),
});

export const StakerResponseSchema = z.object({
    address: EthereumAddressSchema.describe(
        'The contract address of the staker'
    ).openapi({ example: '0x0000006c21964af0d420af8992851a30fa13a68b' }),
    operatorAddress: EthereumAddressSchema.describe(
        'The address of the operator'
    ).openapi({ example: '0x71c6f7ed8c2d4925d0baf16f6a85bb1736d412eb' }),
    shares: z.array(StakerSharesSchema),
    tvl: z
        .number()
        .describe('The total value locked in the AVS staker')
        .openapi({ example: 0.040888428658906045 }),
});
