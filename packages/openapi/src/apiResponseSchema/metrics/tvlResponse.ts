import z from '../../../../api/src/schema/zod'
import { Change24HoursResponseSchema, Change7DaysResponseSchema } from './timeChangeResponse'

const createTvlSchema = (description: string) =>
	z.object({
		tvl: z.number().describe(description).openapi({ example: 1000000 }),
		change24h: Change24HoursResponseSchema.optional(),
		change7d: Change7DaysResponseSchema.optional()
	})

export const TvlResponseSchema = createTvlSchema('The value of the TVL in ETH')

export const TotalTvlResponseSchema = createTvlSchema('The value of the combined TVL in ETH')

export const BeaconChainTvlResponseSchema = createTvlSchema(
	'The value of the Beacon Chain restaking TVL in ETH'
)

export const IndividualStrategyTvlResponseSchema = createTvlSchema(
	"The value of the restaking strategy TVL, denominated in the strategy's native token"
).extend({
	tvlEth: z
		.number()
		.describe('The value of the restaking strategy TVL, denominated in ETH')
		.openapi({ example: 1000000 })
})

const createHistoricalTvlSchema = (description: string) =>
	z.object({
		timestamp: z
			.string()
			.describe('The timestamp for the corresponding TVL value')
			.openapi({ example: '2024-04-11T08:31:11.000Z' }),
		tvlEth: z.number().describe(description).openapi({ example: 1000000 })
	})

export const HistoricalTvlResponseSchema = createHistoricalTvlSchema('The value of the TVL in ETH')

export const HistoricalTotalTvlResponseSchema = createHistoricalTvlSchema(
	'The value of the combined TVL in ETH'
)

export const HistoricalBeaconChainTvlResponseSchema = createHistoricalTvlSchema(
	'The value of the Beacon Chain restaking TVL in ETH'
)

export const HistoricalIndividualStrategyTvlResponseSchema = createHistoricalTvlSchema(
	'The value of the restaking strategy TVL, denominated in ETH'
)
