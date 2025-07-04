import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { WithCuratedMetadata } from '../../../../api/src/schema/zod/schemas/withCuratedMetadataQuery'
import { WithRewardsQuerySchema } from '../../../../api/src/schema/zod/schemas/withRewardsQuery'
import { WithTrailingApySchema } from '../../../../api/src/schema/zod/schemas/withTrailingApySchema'
import { AvsWithRewardsSchema } from '../../apiResponseSchema/avs/avsResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const CombinedQuerySchema = z
	.object({})
	.merge(WithTvlQuerySchema)
	.merge(WithCuratedMetadata)
	.merge(WithRewardsQuerySchema)
	.merge(WithTrailingApySchema)

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
		path: AvsAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The AVS record found.',
			content: {
				'application/json': {
					schema: AvsWithRewardsSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
