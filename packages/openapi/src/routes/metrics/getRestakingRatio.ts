import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { RestakingRatioSchema } from '../../apiResponseSchema/metrics/ratioResponse'
import { RatioWithChangeQuerySchema } from '../../../../api/src/schema/zod/schemas/withChangeQuery'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const QuerySchema = z.object({}).merge(RatioWithChangeQuerySchema)

export const getRestakingRatio: ZodOpenApiOperationObject = {
	operationId: 'getRestakingRatio',
	summary: 'Retrieve restaking ratio',
	description:
		'Returns restaking ratio, which is calculated as the total EigenLayer TVL divided by the total ETH in circulation.',
	tags: ['Metrics'],
	requestParams: { query: QuerySchema, header: AuthHeaderSchema },
	responses: {
		'200': {
			description: 'The value of restaking ratio',
			content: {
				'application/json': {
					schema: RestakingRatioSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
