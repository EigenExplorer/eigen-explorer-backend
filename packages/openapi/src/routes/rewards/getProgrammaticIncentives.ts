import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { AuthHeaderSchema } from '../../authHeaderSchema'
import { PiDetailsQuerySchema } from '../../../../api/src/schema/zod/schemas/piSchema'
import { piApyResponseSchema } from '../../apiResponseSchema/base/piApyResponse'

export const getProgrammaticIncentives: ZodOpenApiOperationObject = {
	operationId: 'getProgrammaticIncentives',
	summary: 'Retrieve eigenlayer programmatic incentives data',
	description:
		'Returns base and aggregate APYs for EigenLayer strategies and estimated weekly EIGEN rewards.',
	tags: ['Rewards'],
	requestParams: { query: PiDetailsQuerySchema, header: AuthHeaderSchema },
	responses: {
		'200': {
			description:
				'APY values for Eigen and LST strategies, and estimated EIGEN rewards if token holdings are provided.',
			content: {
				'application/json': {
					schema: piApyResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
