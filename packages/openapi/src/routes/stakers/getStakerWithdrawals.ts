import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { WithdrawalsResponseWithIsCompletedAndUpdateFields } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema'

const WithdrawalsResponseSchemaWithMeta = z.object({
	data: z.array(WithdrawalsResponseWithIsCompletedAndUpdateFields),
	meta: PaginationMetaResponsesSchema
})

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x9791fdb4e9c0495efc5a1f3f9271ef226251eb34'
	})
})

export const getStakerWithdrawals: ZodOpenApiOperationObject = {
	operationId: 'getStakerWithdrawals',
	summary: 'Retrieve all withdrawals by staker address',
	description:
		'Returns all withdrawal data of the requested staker, including the withdrawal root, nonce, withdrawal status, and other relevant information.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: PaginationQuerySchema
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
