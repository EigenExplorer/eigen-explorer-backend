import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery'
import { HistoricalValueAggregateSchema } from '../../apiResponseSchema/metrics/historicalAggregateResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const HistoricalDepositsAggregateResponseSchema = z.object({
	data: z.array(HistoricalValueAggregateSchema)
})

export const getHistoricalDepositAggregate: ZodOpenApiOperationObject = {
	operationId: 'getHistoricalDepositsAggregate',
	summary: 'Retrieve historical deposit aggregate data',
	description:
		'Returns historical aggregate data for deposits, including the total value of deposits in ETH at specified timestamp values.',
	tags: ['Metrics'],
	requestParams: {
		query: HistoricalCountSchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description:
				'The historical aggregate data for deposits, including the total value of deposits in ETH at specified timestamp values.',
			content: {
				'application/json': {
					schema: HistoricalDepositsAggregateResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
