import { ZodOpenApiOperationObject } from 'zod-openapi'
import z from '../../../../api/src/schema/zod'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import {
	SortByApy,
	SortByTotalAvs,
	SortByTotalStakers,
	SortByTvl
} from '../../../../api/src/schema/zod/schemas/separateSortingQueries'
import { SearchByText } from '../../../../api/src/schema/zod/schemas/separateSearchQueries'
import { OperatorResponseSchema } from '../../apiResponseSchema/operator/operatorResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const AllOperatorsResponseSchema = z.object({
	data: z.array(OperatorResponseSchema),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchema = z
	.object({})
	.merge(WithTvlQuerySchema)
	.merge(SearchByText)
	.merge(SortByApy)
	.merge(SortByTvl)
	.merge(SortByTotalAvs)
	.merge(SortByTotalStakers)
	.merge(PaginationQuerySchema)

export const getAllOperators: ZodOpenApiOperationObject = {
	operationId: 'getAllOperators',
	summary: 'Retrieve all operators',
	description: 'Returns all operator records. This endpoint supports pagination.',
	tags: ['Operators'],
	requestParams: {
		query: CombinedQuerySchema.refine(
			(data) => {
				const sortByFields = [
					data.sortByApy,
					data.sortByTvl,
					data.sortByTotalAvs,
					data.sortByTotalStakers
				].filter((field) => field !== undefined)
				return sortByFields.length <= 1
			},
			{
				message: 'Only one sortBy option can be used',
				path: ['sortByTvl', 'sortByTotalAvs', 'sortByTotalStakers']
			}
		),
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of operator records.',
			content: {
				'application/json': {
					schema: AllOperatorsResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
