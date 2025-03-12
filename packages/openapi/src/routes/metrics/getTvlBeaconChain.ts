import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { BeaconChainTvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse'
import { WithChangeQuerySchema } from '../../../../api/src/schema/zod/schemas/withChangeQuery'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const QuerySchema = z.object({}).merge(WithChangeQuerySchema)

export const getBeaconChainTvlMetric: ZodOpenApiOperationObject = {
	operationId: 'getBeaconChainTvlMetric',
	summary: 'Retrieve Beacon Chain restaking TVL',
	description: 'Returns the total value locked (TVL) in the Beacon Chain restaking EigenPods.',
	tags: ['Metrics'],
	requestParams: { query: QuerySchema, header: AuthHeaderSchema },
	responses: {
		'200': {
			description: 'The value of the Beacon Chain restaking TVL in ETH.',
			content: {
				'application/json': {
					schema: BeaconChainTvlResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
