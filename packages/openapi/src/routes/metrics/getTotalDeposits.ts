import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { TotalDepositsSchema } from '../../apiResponseSchema/metrics/timeChangeResponse'
import { CountOfDepositsWithChangeQuerySchema } from '../../../../api/src/schema/zod/schemas/withChangeQuery'

const QuerySchema = z.object({}).merge(CountOfDepositsWithChangeQuerySchema)

export const getTotalDeposits: ZodOpenApiOperationObject = {
	operationId: 'getTotalDeposits',
	summary: 'Retrieve total number of deposits',
	description: 'Returns the total number of deposits.',
	tags: ['Metrics'],
	requestParams: { query: QuerySchema },
	responses: {
		'200': {
			description: 'The total number of deposits.',
			content: {
				'application/json': {
					schema: TotalDepositsSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
