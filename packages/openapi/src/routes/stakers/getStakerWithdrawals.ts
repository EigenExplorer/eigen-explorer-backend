import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
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
