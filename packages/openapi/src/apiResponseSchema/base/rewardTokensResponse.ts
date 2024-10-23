import z from '../../../../api/src/schema/zod'

export const RewardsTokenSchema = z.object({
	strategies: z.array(
		z.object({
			strategyAddress: z
				.string()
				.describe('The address of the strategy')
				.openapi({ example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6' }),
			tokens: z
				.array(z.string())
				.describe('Array of token addresses associated with the strategy')
				.openapi({
					example: [
						'0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
						'0xba50933c268f567bdc86e1ac131be072c6b0b71a'
					]
				})
		})
	),
	total: z.number().describe('The total number of strategies').openapi({ example: 15 })
})
