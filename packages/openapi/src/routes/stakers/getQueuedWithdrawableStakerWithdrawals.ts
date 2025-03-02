import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { WithdrawalsResponseSchema } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const WithdrawalsResponseSchemaWithMeta = z.object({
	data: z.array(WithdrawalsResponseSchema),
	meta: PaginationMetaResponsesSchema
})

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x9791fdb4e9c0495efc5a1f3f9271ef226251eb34'
	})
})

export const getQueuedWithdrawableStakerWithdrawals: ZodOpenApiOperationObject = {
	operationId: 'getQueuedWithdrawableStakerWithdrawals',
	summary: 'Retrieve queued and withdrawable withdrawals by staker address',
	description: 'Returns all queued and withdrawable withdrawal data of the requested staker.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: PaginationQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of queued and withdrawable withdrawals.',
			content: {
				'application/json': {
					schema: WithdrawalsResponseSchemaWithMeta
				}
			}
		},
		...openApiErrorResponses
	}
}
