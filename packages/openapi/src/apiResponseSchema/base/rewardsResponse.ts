import z from '../../../../api/src/schema/zod'

export const RewardsSchema = z.object({
	strategies: z.array(
		z.object({
			strategyAddress: z
				.string()
				.describe('The contract address of the restaking strategy')
				.openapi({ example: '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0' }),
			apy: z.number().describe('The APY of the restaking strategy').openapi({ example: 0.1 })
		})
	),
	aggregateApy: z
		.number()
		.describe('The aggregate APY across all strategies')
		.openapi({ example: 1.0 })
})
