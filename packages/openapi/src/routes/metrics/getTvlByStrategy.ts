import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { IndividualStrategyTvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse'
import z from '../../../../api/src/schema/zod'
import { WithChangeQuerySchema } from '../../../../api/src/schema/zod/schemas/withChangeQuery'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

const RestakingStrategyAddressParam = z.object({
	strategy: EthereumAddressSchema.describe('The address of the restaking strategy').openapi({
		example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6'
	})
})

const QuerySchema = z.object({}).merge(WithChangeQuerySchema)

export const getTvlRestakingMetricByStrategy: ZodOpenApiOperationObject = {
	operationId: 'getTvlRestakingMetricByStrategy',
	summary: 'Retrieve a strategy TVL by address',
	description: 'Returns the total value locked (TVL) in a specific LST strategy.',
	tags: ['Metrics'],
	requestParams: {
		query: QuerySchema,
		path: RestakingStrategyAddressParam
	},
	responses: {
		'200': {
			description:
				'The value of combined restaking strategy TVL and a breakdown of the TVL for each individual strategy.',
			content: {
				'application/json': {
					schema: IndividualStrategyTvlResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
