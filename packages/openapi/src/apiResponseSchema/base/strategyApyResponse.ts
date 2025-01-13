import z from '../../../../api/src/schema/zod'

export const StrategyApySchema = z.object({
	strategyAddress: z
		.string()
		.describe('The contract address of the restaking strategy')
		.openapi({ example: '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0' }),
	apy: z
		.number()
		.describe('The cumulative APY from all tokens in this strategy')
		.openapi({ example: 0.1 }),
	tokens: z.array(
		z.object({
			tokenAddress: z
				.string()
				.describe('The contract address of the token involved in the strategy')
				.openapi({ example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' }),
			apy: z
				.number()
				.describe('The APY contributed by this individual token')
				.openapi({ example: 0.1 })
		})
	)
})

export const StakerStrategyApySchema = z.object({
	strategyAddress: z
		.string()
		.describe('The contract address of the restaking strategy')
		.openapi({ example: '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0' }),
	apy: z
		.number()
		.describe('The cumulative APY for this strategy summed across all AVSs')
		.openapi({ example: 0.1 }),
	tokens: z.array(
		z.object({
			tokenAddress: z
				.string()
				.describe('The contract address of the token involved in the strategy')
				.openapi({ example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' }),
			apy: z
				.number()
				.describe('The APY contributed by this individual token')
				.openapi({ example: 0.1 })
		})
	)
})
