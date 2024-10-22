import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { TotalTvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse'
import { WithChangeQuerySchema } from '../../../../api/src/schema/zod/schemas/withChangeQuery'

const QuerySchema = z.object({}).merge(WithChangeQuerySchema)

export const getTvlMetrics: ZodOpenApiOperationObject = {
	operationId: 'getTvlMetrics',
	summary: 'Retrieve total TVL',
	description:
		'Returns the total value locked (TVL) in all restaking strategies and Beacon Chain restaking.',
	tags: ['Metrics'],
	requestParams: { query: QuerySchema },
	responses: {
		'200': {
			description: 'The value of the combined TVL in ETH.',
			content: {
				'application/json': {
					schema: TotalTvlResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
