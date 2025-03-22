import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { OperatorAllocationDelaySchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

export const getOperatorAllocationDelay: ZodOpenApiOperationObject = {
	operationId: 'getOperatorAllocationDelay',
	summary: 'Retrieve allocation delay for an operator addresses',
	description: 'Returns the allocation delay for an operator addresses.',
	tags: ['Operators'],
	requestParams: {
		path: OperatorAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The information regarding allocation delay.',
			content: {
				'application/json': {
					schema: OperatorAllocationDelaySchema
				}
			}
		},
		...openApiErrorResponses
	}
}
