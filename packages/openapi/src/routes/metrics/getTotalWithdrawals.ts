import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { TotalWithdrawalsSchema } from '../../apiResponseSchema/metrics/timeChangeResponse'
import { CountOfWithdrawalsWithChangeQuerySchema } from '../../../../api/src/schema/zod/schemas/withChangeQuery'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const QuerySchema = z.object({}).merge(CountOfWithdrawalsWithChangeQuerySchema)

export const getTotalWithdrawals: ZodOpenApiOperationObject = {
	operationId: 'getTotalWithdrawals',
	summary: 'Retrieve total number of withdrawals ',
	description: 'Returns the total number of withdrawals.',
	tags: ['Metrics'],
	requestParams: { query: QuerySchema, header: AuthHeaderSchema },
	responses: {
		'200': {
			description: 'The total number of withdrawals.',
			content: {
				'application/json': {
					schema: TotalWithdrawalsSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
