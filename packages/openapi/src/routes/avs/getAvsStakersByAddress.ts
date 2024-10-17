import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { StakerResponseSchema } from '../../apiResponseSchema/stakerResponse'
import { UpdatedSinceQuerySchema } from '../../../../api/src/schema/zod/schemas/updatedSinceQuery'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

const CombinedQuerySchema = z
	.object({})
	.merge(WithTvlQuerySchema)
	.merge(UpdatedSinceQuerySchema)
	.merge(PaginationQuerySchema)

const AvsStakerResponseSchema = z.object({
	data: z.array(StakerResponseSchema),
	meta: PaginationMetaResponsesSchema
})

export const getAvsStakersByAddress: ZodOpenApiOperationObject = {
	operationId: 'getAvsStakersByAddress',
	summary: 'Retrieve all stakers for a given AVS address',
	description: 'Returns all stakers for a given AVS address. This endpoint supports pagination.',
	tags: ['AVS'],
	requestParams: {
		path: AvsAddressParam,
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The stakers record found for the AVS.',
			content: {
				'application/json': {
					schema: AvsStakerResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
