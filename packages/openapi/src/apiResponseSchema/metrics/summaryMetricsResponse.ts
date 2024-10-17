import z from '../../../../api/src/schema/zod'
import { StrategyEthTvlSchema, StrategyTvlSchema } from '../base/strategyTvlResponse'

export const SummaryMetricsResponseSchema = z.object({
	tvl: z
		.number()
		.describe('The total value locked (TVL) in ETH in the EigenLayer ecosystem')
		.openapi({ example: 1000000 }),
	tvlBeaconChain: z
		.number()
		.describe('The total value locked (TVL) in ETH in the beacon chain ETH strategy')
		.openapi({ example: 1000000 }),
	tvlRestaking: z
		.number()
		.describe('The total value locked (TVL) in ETH in all restaking strategies')
		.openapi({ example: 1000000 }),
	tvlStrategies: StrategyTvlSchema,
	tvlStrategiesEth: StrategyEthTvlSchema,
	totalAVS: z.number().describe('The total number of AVS').openapi({ example: 10 }),
	totalOperators: z.number().describe('The total number of AVS operators').openapi({ example: 10 }),
	totalStakers: z.number().describe('The total number of AVS stakers').openapi({ example: 10 })
})
