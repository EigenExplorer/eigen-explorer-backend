import z from '../../../../api/src/schema/zod'
import { StrategySharesSchema } from '../../../../api/src/schema/zod/schemas/base/strategyShares'

export const DepositsResponseSchema = z.object({
	transactionHash: z
		.string()
		.describe('The hash of the transaction')
		.openapi({ example: '0x9d0a355df5a937516dfaed6721b0b461a16b8fad005f66d7dbf56b8a39136297' }),
	stakerAddress: z
		.string()
		.describe('The address of the staker')
		.openapi({ example: '0x74ede5f75247fbdb9266d2b3a7be63b3db7611dd' }),
	tokenAddress: z
		.string()
		.describe('The address of the token')
		.openapi({ example: '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb' }),
	strategyAddress: z
		.string()
		.describe('The contract address of the restaking strategy')
		.openapi({ example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6' }),
	shares: z
		.string()
		.describe('The amount of shares held in the strategy')
		.openapi({ example: '40888428658906049' }),
	createdAtBlock: z
		.number()
		.describe('The block number when the withdrawal was recorded by EigenExplorer')
		.openapi({ example: 19912470 }),
	createdAt: z
		.string()
		.describe('The time stamp when the withdrawal was recorded by EigenExplorer')
		.openapi({ example: '2024-07-07T23:53:35.000Z' })
})
