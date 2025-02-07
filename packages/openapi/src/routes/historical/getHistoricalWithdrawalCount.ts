import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery'
import { WithdrawalHistoricalCountSchema } from '../../apiResponseSchema/metrics/historicalCountResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const HistoricalWithdrawalCountResponseSchema = z.object({
	data: z.array(WithdrawalHistoricalCountSchema)
})

export const getHistoricalWithdrawalCount: ZodOpenApiOperationObject = {
	operationId: 'getHistoricalWithdrawalCount',
	summary: 'Retrieve historical count of withdrawals',
	description: 'Returns the total number of withdrawals made at timestamp values.',
	tags: ['Metrics'],
	requestParams: {
		query: HistoricalCountSchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The total number of withdrawals made at timestamp values.',
			content: {
				'application/json': {
					schema: HistoricalWithdrawalCountResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
