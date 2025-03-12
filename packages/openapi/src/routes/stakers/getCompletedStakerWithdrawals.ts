import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { WithdrawalsResponseWithUpdateFields } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const WithdrawalsResponseSchemaWithMeta = z.object({
	data: z.array(WithdrawalsResponseWithUpdateFields),
	meta: PaginationMetaResponsesSchema
})

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x9791fdb4e9c0495efc5a1f3f9271ef226251eb34'
	})
})

export const getCompletedStakerWithdrawals: ZodOpenApiOperationObject = {
	operationId: 'getCompletedStakerWithdrawals',
	summary: 'Retrieve completed withdrawals by staker address',
	description: 'Returns all completed withdrawal data of the requested staker.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: PaginationQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of completed withdrawals.',
			content: {
				'application/json': {
					schema: WithdrawalsResponseSchemaWithMeta
				}
			}
		},
		...openApiErrorResponses
	}
}
