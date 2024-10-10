import z from '../../../../api/src/schema/zod'
import { StrategySharesSchema } from '../../../../api/src/schema/zod/schemas/base/strategyShares'

export const WithdrawalsResponseSchema = z.object({
	withdrawalRoot: z.string().describe('The root hash of the withdrawal').openapi({
		example: '0x9e6728ef0a8ad6009107a886047aae35bc5ed7deaa68580b0d1f8f67e3e5ed31'
	}),
	nonce: z.number().describe('The nonce of the withdrawal').openapi({ example: 0 }),
	isCompleted: z
		.boolean()
		.describe('Indicates if the withdrawal is completed')
		.openapi({ example: false }),
	stakerAddress: z
		.string()
		.describe('The address of the staker')
		.openapi({ example: '0x74ede5f75247fbdb9266d2b3a7be63b3db7611dd' }),
	delegatedTo: z
		.string()
		.describe('The operator address to which staking is delegated')
		.openapi({ example: '0x0000000000000000000000000000000000000000' }),
	withdrawerAddress: z
		.string()
		.describe('The address of the withdrawer')
		.openapi({ example: '0x74ede5f75247fbdb9266d2b3a7be63b3db7611dd' }),
	shares: z
		.array(StrategySharesSchema)
		.describe('The list of strategy shares')
		.openapi({
			example: [
				{
					strategyAddress: '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
					shares: '1000288824523326631'
				}
			]
		}),
	startBlock: z
		.number()
		.describe('The block number when the withdrawal was queued')
		.openapi({ example: 19912470 }),
	createdAtBlock: z
		.number()
		.describe('The block number when the withdrawal was recorded by EigenExplorer')
		.openapi({ example: 19912470 }),
	updatedAtBlock: z
		.number()
		.describe('The block number when the withdrawal was last updated')
		.openapi({ example: 19912470 }),
	createdAt: z
		.string()
		.describe('The time stamp when the withdrawal was recorded by EigenExplorer')
		.openapi({ example: '2024-07-07T23:53:35.000Z' }),
	updatedAt: z
		.string()
		.describe('The time stamp when the withdrawal was last updated')
		.openapi({ example: '2024-07-07T23:53:35.000Z' })
})
