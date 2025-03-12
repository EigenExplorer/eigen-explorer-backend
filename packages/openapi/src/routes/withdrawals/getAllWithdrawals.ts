import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { WithdrawalListQuerySchema } from '../../../../api/src/schema/zod/schemas/withdrawal'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { WithdrawalsResponseWithIsCompletedAndUpdateFields } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const WithdrawalsResponseSchemaWithMeta = z.object({
	data: z.array(WithdrawalsResponseWithIsCompletedAndUpdateFields),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchema = z
	.object({})
	.merge(WithdrawalListQuerySchema)
	.merge(PaginationQuerySchema)

export const getAllWithdrawals: ZodOpenApiOperationObject = {
	operationId: 'getAllWithdrawals',
	summary: 'Retrieve all withdrawals',
	description:
		'Returns all withdrawal data, including the withdrawal root, nonce, withdrawal status, and other relevant information.',
	tags: ['Withdrawals'],
	requestParams: {
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of withdrawals.',
			content: {
				'application/json': {
					schema: WithdrawalsResponseSchemaWithMeta
				}
			}
		},
		...openApiErrorResponses
	}
}
