import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery'
import { HistoricalTotalTvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const HistoricalTotalTvlCombinedResponseSchema = z.object({
	data: z.array(HistoricalTotalTvlResponseSchema)
})

export const getHistoricalTvl: ZodOpenApiOperationObject = {
	operationId: 'getHistoricalTvl',
	summary: 'Retrieve historical total TVL data',
	description:
		'Returns the historical total value locked (TVL) data over specified timestamp values in all restaking strategies and Beacon Chain restaking.',
	tags: ['Metrics'],
	requestParams: {
		query: HistoricalCountSchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The historical data of combined TVL over specified timestamp values.',
			content: {
				'application/json': {
					schema: HistoricalTotalTvlCombinedResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
