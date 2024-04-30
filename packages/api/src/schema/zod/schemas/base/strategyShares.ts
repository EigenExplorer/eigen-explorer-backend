import z from '../..';
import { EthereumAddressSchema } from './ethereumAddress';

export const StrategySharesSchema = z.object({
    strategyAddress: EthereumAddressSchema.describe(
        'The contract address of the restaking strategy'
    ).openapi({ example: '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0' }),
    shares: z
        .string()
        .describe('The amount of shares held in the strategy')
        .openapi({ example: '1277920000000000000000000' }),
});
