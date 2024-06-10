import z from '../'

export const DepositListQuerySchema = z.object({
	stakerAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address of the staker')
		.openapi({ example: '0x74ede5f75247fbdb9266d2b3a7be63b3db7611dd' }),
	tokenAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address of the token deposited')
		.openapi({ example: '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb' }),
	strategyAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The contract address of the restaking strategy')
		.openapi({ example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6' })
})
