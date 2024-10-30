import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

export const OperatorRewardsSchema = z.object({
	address: EthereumAddressSchema.describe('The contract address of the AVS operator').openapi({
		example: '0xdbed88d83176316fc46797b43adee927dc2ff2f5'
	}),
	rewardTokens: z
		.array(EthereumAddressSchema)
		.describe('List of tokens in which the operator receives rewards')
		.openapi({
			example: [
				'0xba50933c268f567bdc86e1ac131be072c6b0b71a',
				'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
			]
		}),
	rewardStrategies: z
		.array(EthereumAddressSchema)
		.describe('List of strategies for which the operator receives rewards')
		.openapi({
			example: [
				'0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6',
				'0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff'
			]
		})
})
