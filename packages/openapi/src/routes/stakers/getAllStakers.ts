import { ZodOpenApiOperationObject } from 'zod-openapi'
import z from '../../../../api/src/schema/zod'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { UpdatedSinceQuerySchema } from '../../../../api/src/schema/zod/schemas/updatedSinceQuery'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { StakerResponseSchema } from '../../apiResponseSchema/stakerResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const AllStakersResponseSchema = z.object({
	data: z.array(StakerResponseSchema),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchema = z
	.object({})
	.merge(WithTvlQuerySchema)
	.merge(UpdatedSinceQuerySchema)
	.merge(PaginationQuerySchema)

export const getAllStakers: ZodOpenApiOperationObject = {
	operationId: 'getAllStakers',
	summary: 'Retrieve all stakers',
	description: 'Returns all staker records. This endpoint supports pagination.',
	tags: ['Stakers'],
	requestParams: {
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of staker records.',
			content: {
				'application/json': {
					schema: AllStakersResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
