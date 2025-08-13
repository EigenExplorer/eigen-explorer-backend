import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { OperatorMagnitudesSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { StrategyAddressQuerySchema } from '../../../../api/src/schema/zod/schemas/operatorSetSchemas'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

const CombinedQuerySchema = z.object({}).merge(StrategyAddressQuerySchema)

export const getOperatorMagnitudes: ZodOpenApiOperationObject = {
	operationId: 'getOperatorMagnitudes',
	summary: 'Retrieve magnitude for an operator addresses',
	description: 'Returns the magnitude details for an operator addresses.',
	tags: ['Operators'],
	requestParams: {
		query: CombinedQuerySchema,
		path: OperatorAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The information regarding magnitudes.',
			content: {
				'application/json': {
					schema: OperatorMagnitudesSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
