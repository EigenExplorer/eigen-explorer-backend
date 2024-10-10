import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { TotalTvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse'

export const getTvlMetrics: ZodOpenApiOperationObject = {
	operationId: 'getTvlMetrics',
	summary: 'Retrieve total TVL',
	description:
		'Returns the total value locked (TVL) in all restaking strategies and Beacon Chain restaking.',
	tags: ['Metrics'],
	requestParams: {},
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
