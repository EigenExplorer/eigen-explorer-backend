import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { WithAdditionalDataQuerySchema } from '../../../../api/src/schema/zod/schemas/withAdditionalDataQuery'
import { WithRewardsQuerySchema } from '../../../../api/src/schema/zod/schemas/withRewardsQuery'
import { WithTrailingApySchema } from '../../../../api/src/schema/zod/schemas/withTrailingApySchema'
import { OperatorWithRewardsResponseSchema } from '../../apiResponseSchema/operator/operatorWithRewardsResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

const CombinedQuerySchema = z
	.object({})
	.merge(WithTvlQuerySchema)
	.merge(WithAdditionalDataQuerySchema)
	.merge(WithRewardsQuerySchema)
	.merge(WithTrailingApySchema)

export const getOperatorByAddress: ZodOpenApiOperationObject = {
	operationId: 'getOperatorByAddress',
	summary: 'Retrieve an operator by address',
	description: 'Returns an operator record by address.',
	tags: ['Operators'],
	requestParams: {
		query: CombinedQuerySchema,
		path: OperatorAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The record of the requested operator.',
			content: {
				'application/json': {
					schema: OperatorWithRewardsResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
