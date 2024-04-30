import z from '../../../../api/src/schema/zod';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';

export const AvsAddressSchema = z.object({
    name: z
        .string()
        .describe("The AVS's name")
        .openapi({ example: 'Example AVS' }),
    address: EthereumAddressSchema.describe(
        'AVS service manager contract address'
    ).openapi({ example: '0x35f4f28a8d3ff20eed10e087e8f96ea2641e6aa1' }),
});
