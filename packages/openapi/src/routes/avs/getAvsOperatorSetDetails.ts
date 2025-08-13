import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AvsOperatorSetDetailsSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const OperatorSetParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	operatorSetId: z.number().describe('The ID of the operator-set').openapi({
		example: 1
	})
})

export const getAvsOperatorSetDetails: ZodOpenApiOperationObject = {
	operationId: 'getAvsOperatorSetDetails',
	summary: 'Retrieve details about an operator-set for an AVS',
	description: 'Returns information about a particular operator-set for an AVS address',
	tags: ['AVS'],
	requestParams: {
		path: OperatorSetParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The information about operator-set.',
			content: {
				'application/json': {
					schema: AvsOperatorSetDetailsSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
