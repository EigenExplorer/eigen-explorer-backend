import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import {
	SearchByText,
	SearchMode
} from '../../../../api/src/schema/zod/schemas/separateSearchQueries'
import { OperatorAddressSchema } from '../../apiResponseSchema/operator/operatorAddressResponse'

const OperatorAddressResponseSchema = z.object({
	data: z.array(OperatorAddressSchema),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchema = z
	.object({})
	.merge(SearchMode)
	.merge(SearchByText)
	.merge(PaginationQuerySchema)

export const getAllOperatorAddresses: ZodOpenApiOperationObject = {
	operationId: 'getAllOperatorAddresses',
	summary: 'Retrieve all operator addresses',
	description: 'Returns a list of all operator addresses. This page supports pagination.',
	tags: ['Operators'],
	requestParams: {
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The list of operator addresses.',
			content: {
				'application/json': {
					schema: OperatorAddressResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
