import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AvsSchema } from '../../apiResponseSchema/avs/avsResponse'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { WithCuratedMetadata } from '../../../../api/src/schema/zod/schemas/withCuratedMetadataQuery'

const CombinedQuerySchema = z.object({}).merge(WithTvlQuerySchema).merge(WithCuratedMetadata)

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

export const getAvsByAddress: ZodOpenApiOperationObject = {
	operationId: 'getAvsByAddress',
	summary: 'Retrieve an AVS by address',
	description: 'Returns a single AVS record by address.',
	tags: ['AVS'],
	requestParams: {
		query: CombinedQuerySchema,
		path: AvsAddressParam
	},
	responses: {
		'200': {
			description: 'The AVS record found.',
			content: {
				'application/json': {
					schema: AvsSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
