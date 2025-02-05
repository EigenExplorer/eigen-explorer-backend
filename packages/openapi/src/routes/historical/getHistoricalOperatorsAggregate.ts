import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { OperatorsHistoricalAggregateSchema } from '../../apiResponseSchema/metrics/historicalAggregateResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const HistoricalOperatorsAggregateResponseSchema = z.object({
	data: z.array(OperatorsHistoricalAggregateSchema)
})

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

export const getHistoricalOperatorsAggregate: ZodOpenApiOperationObject = {
	operationId: 'getHistoricalOperatorsAggregate',
	summary: 'Retrieve historical AVS operator aggregate data',
	description:
		'Returns historical aggregate data for an operator including TVL and total number of stakers at specified timestamp values.',
	tags: ['Metrics'],
	requestParams: {
		query: HistoricalCountSchema,
		path: AvsAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description:
				'The historical aggregate data for an AVS operator including TVL and total number of stakers at specified timestamp values.',
			content: {
				'application/json': {
					schema: HistoricalOperatorsAggregateResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
