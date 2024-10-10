import { ZodOpenApiOperationObject } from 'zod-openapi'
import z from '../../../../api/src/schema/zod'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { StakerResponseSchema } from '../../apiResponseSchema/stakerResponse'

const AllStakersResponseSchema = z.object({
	data: z.array(StakerResponseSchema),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchema = z.object({}).merge(WithTvlQuerySchema).merge(PaginationQuerySchema)

export const getAllStakers: ZodOpenApiOperationObject = {
	operationId: 'getAllStakers',
	summary: 'Retrieve all stakers',
	description: 'Returns all staker records. This endpoint supports pagination.',
	tags: ['Stakers'],
	requestParams: {
		query: CombinedQuerySchema
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
