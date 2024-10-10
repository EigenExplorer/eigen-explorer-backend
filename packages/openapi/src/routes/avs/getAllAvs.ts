import { ZodOpenApiOperationObject } from 'zod-openapi'
import z from '../../../../api/src/schema/zod'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { AvsSchema } from '../../apiResponseSchema/avs/avsResponse'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { WithCuratedMetadata } from '../../../../api/src/schema/zod/schemas/withCuratedMetadataQuery'
import {
	SortByApy,
	SortByTotalOperators,
	SortByTotalStakers,
	SortByTvl
} from '../../../../api/src/schema/zod/schemas/separateSortingQueries'
import { 
	SearchByText, 
	SearchMode
} from '../../../../api/src/schema/zod/schemas/separateSearchQueries'

const AvsResponseSchema = z.object({
	data: z.array(AvsSchema),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchema = z
	.object({})
	.merge(WithTvlQuerySchema)
	.merge(WithCuratedMetadata)
	.merge(SearchMode)
	.merge(SearchByText)
	.merge(SortByApy)
	.merge(SortByTvl)
	.merge(SortByTotalStakers)
	.merge(SortByTotalOperators)
	.merge(PaginationQuerySchema)

export const getAllAvs: ZodOpenApiOperationObject = {
	operationId: 'getAllAvs',
	summary: 'Retrieve all AVS',
	description: 'Returns all AVS records. This endpoint supports pagination.',
	tags: ['AVS'],
	requestParams: {
		query: CombinedQuerySchema.refine(
			(data) => {
				const sortByFields = [
					data.sortByTvl,
					data.sortByApy,
					data.sortByTotalStakers,
					data.sortByTotalOperators
				].filter((field) => field !== undefined)
				return sortByFields.length <= 1
			},
			{
				message: 'Only one sortBy option can be used',
				path: ['sortByTvl', 'sortByApy', 'sortByTotalStakers', 'sortByTotalOperators']
			}
		)
	},
	responses: {
		'200': {
			description: 'The list of AVS records.',
			content: {
				'application/json': {
					schema: AvsResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
