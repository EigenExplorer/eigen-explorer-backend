import z from '../../../../api/src/schema/zod'

export const TvlResponseSchema = z.object({
	tvl: z.number().openapi({ example: 1000000 })
})

export const TotalTvlResponseSchema = TvlResponseSchema.extend({
	tvl: z.number().describe('The value of the combined TVL in ETH').openapi({ example: 1000000 })
})

export const BeaconChainTvlResponseSchema = TvlResponseSchema.extend({
	tvl: z
		.number()
		.describe('The value of the Beacon Chain restaking TVL in ETH')
		.openapi({ example: 1000000 })
})

export const IndividualStrategyTvlResponseSchema = TvlResponseSchema.extend({
	tvl: z
		.number()
		.describe("The value of the restaking strategy TVL, denominated in the strategy's native token")
		.openapi({ example: 1000000 })
})
