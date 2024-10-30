import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

export const OperatorAddressSchema = z.object({
	address: EthereumAddressSchema.describe('The contract address of the AVS operator').openapi({
		example: '0x0000039b2f2ac9e3492a0f805ec7aea9eaee0c25'
	}),
	name: z.string().describe("The Operator's name").openapi({ example: 'Example Operator' }),
	logo: z
		.string()
		.describe("The Operator's logo URL")
		.openapi({ example: 'https://example.operator/logo.png' })
})
