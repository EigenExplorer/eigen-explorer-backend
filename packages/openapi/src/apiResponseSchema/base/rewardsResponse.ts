import z from '../../../../api/src/schema/zod'
import { StrategyTvlSchema, StrategyEthTvlSchema } from './strategyTvlResponse'

export const RewardsSchema = z.object({
	strategies: z.array(
		z.object({
			strategyAddress: z
				.string()
				.describe('The address of the strategy')
				.openapi({ example: '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0' }),
			apy: z
				.number()
				.describe('The APY of the strategy')
				.openapi({ example: 0.00016956497239057833 })
		})
	),
	aggregateApy: z
		.number()
		.describe('The aggregate APY across all strategies')
		.openapi({ example: 1.060577413975275 })
})
