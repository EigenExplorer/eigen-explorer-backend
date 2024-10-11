import z from '../../../../api/src/schema/zod'

export const HistoricalAggregateSchema = z.object({
	timestamp: z
		.string()
		.describe('The timestamp for the recorded data point')
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	tvlEth: z
		.number()
		.describe('The total value locked (TVL) in ETH at the timestamp')
		.openapi({ example: 10 })
})

export const OperatorsHistoricalAggregateSchema = HistoricalAggregateSchema.extend({
	totalStakers: z
		.number()
		.describe('The total number of stakers at the timestamp')
		.openapi({ example: 10 }),
	totalAvs: z.number().describe('The total number of AVS at the timestamp').openapi({ example: 10 })
})

export const AvsHistoricalAggregateSchema = HistoricalAggregateSchema.extend({
	totalStakers: z
		.number()
		.describe('The total number of stakers at the timestamp')
		.openapi({ example: 10 }),
	totalOperators: z
		.number()
		.describe('The total number of operators at the timestamp')
		.openapi({ example: 10 })
})

export const HistoricalValueAggregateSchema = z.object({
	timestamp: z
		.string()
		.describe('The timestamp for the recorded data point')
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	valueEth: z.number().describe('The value in ETH at the timestamp').openapi({ example: 10 })
})
