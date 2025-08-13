import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { AvsOperatorSetsSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AuthHeaderSchema } from '../../authHeaderSchema'
import { AvsOperatorSetOperatorsSchema } from '../../apiResponseSchema/avs/avsOperatorResponse'

const OperatorSetParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	operatorSetId: z.number().describe('The ID of the operator-set').openapi({
		example: 1
	})
})

const AvsOperatorCombinedResponseSchema = z.object({
	data: z.array(AvsOperatorSetOperatorsSchema),
	meta: PaginationMetaResponsesSchema
})

export const getAvsOperatorSetOperators: ZodOpenApiOperationObject = {
	operationId: 'getAvsOperatorSetOperators',
	summary: 'Retrieve all operators of an operator-set for an AVS',
	description:
		'Returns a list of all operators of an operator-set for an AVS address. This page supports pagination.',
	tags: ['AVS'],
	requestParams: {
		query: PaginationQuerySchema,
		path: OperatorSetParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of operators.',
			content: {
				'application/json': {
					schema: AvsOperatorCombinedResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
