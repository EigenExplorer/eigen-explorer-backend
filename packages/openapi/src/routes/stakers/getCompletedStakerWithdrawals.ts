import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { WithdrawalsResponseSchema } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

const WithdrawalsResponseSchemaWithMeta = z.object({
	data: z.array(WithdrawalsResponseSchema),
	meta: PaginationMetaResponsesSchema
})

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x74ede5f75247fbdb9266d2b3a7be63b3db7611dd'
	})
})

export const getCompletedStakerWithdrawals: ZodOpenApiOperationObject = {
	operationId: 'getCompletedStakerWithdrawals',
	summary: 'Retrieve completed withdrawals by staker address',
	description: 'Returns all completed withdrawal data of the requested staker.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: PaginationQuerySchema
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
