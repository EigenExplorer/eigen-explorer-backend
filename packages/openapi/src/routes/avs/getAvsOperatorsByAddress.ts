import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { OperatorResponseSchema } from '../../apiResponseSchema/operatorResponse'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { AvsOperatorResponseSchema } from '../../apiResponseSchema/avs/avsOperatorResponse'
import { SortOperatorsByTvl } from '../../../../api/src/schema/zod/schemas/separateSortingQueries'
import {
	SearchByText,
	SearchMode
} from '../../../../api/src/schema/zod/schemas/separateSearchQueries'

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

const AvsOperatorCombinedResponseSchema = z.object({
	data: z.array(AvsOperatorResponseSchema),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchema = z
	.object({})
	.merge(SearchMode)
	.merge(SearchByText)
	.merge(WithTvlQuerySchema)
	.merge(SortOperatorsByTvl)
	.merge(PaginationQuerySchema)

export const getAvsOperatorsByAddress: ZodOpenApiOperationObject = {
	operationId: 'getAvsOperatorsByAddress',
	summary: 'Retrieve all operators for a given AVS address',
	description: 'Returns all operators for a given AVS address. This endpoint supports pagination.',
	tags: ['AVS'],
	requestParams: {
		path: AvsAddressParam,
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The operators record found for the AVS.',
			content: {
				'application/json': {
					schema: AvsOperatorCombinedResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
