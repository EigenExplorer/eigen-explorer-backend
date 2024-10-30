import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { OperatorRewardsSchema } from '../../apiResponseSchema/operatorRewardsResponse'

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

export const getOperatorRewards: ZodOpenApiOperationObject = {
	operationId: 'getOperatorRewards',
	summary: 'Retrieve rewards info for an operator',
	description:
		'Returns a list of strategies that the Operator is rewarded for, and the tokens they are rewarded in.',
	tags: ['Operators'],
	requestParams: {
		path: OperatorAddressParam
	},
	responses: {
		'200': {
			description: 'The reward strategies and tokens found for the Operator.',
			content: {
				'application/json': {
					schema: OperatorRewardsSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
