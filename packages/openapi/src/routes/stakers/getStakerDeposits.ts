import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { DepositsResponseSchema } from '../../apiResponseSchema/deposits/depositsResponseSchema'

const DepositsResponseSchemaWithMeta = z.object({
	data: z.array(DepositsResponseSchema),
	meta: PaginationMetaResponsesSchema
})

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x9791fdb4e9c0495efc5a1f3f9271ef226251eb34'
	})
})

export const getStakerDeposits: ZodOpenApiOperationObject = {
	operationId: 'getStakerDeposits',
	summary: 'Retrieve all deposits by staker address',
	description:
		'Returns all deposit data of the requested staker, including the transaction hash, token address, strategy address, shares and other relevant information.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: PaginationQuerySchema
	},
	responses: {
		'200': {
			description: 'The list of deposits.',
			content: {
				'application/json': {
					schema: DepositsResponseSchemaWithMeta
				}
			}
		},
		...openApiErrorResponses
	}
}
