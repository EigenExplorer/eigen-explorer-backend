import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { AvsOperatorSetsSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const AvsOperatorSetsResponseSchema = z.object({
	data: z.array(AvsOperatorSetsSchema),
	meta: PaginationMetaResponsesSchema
})

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

export const getAvsOperatorSets: ZodOpenApiOperationObject = {
	operationId: 'getAvsOperatorSets',
	summary: 'Retrieve all operator-sets for an AVS',
	description:
		'Returns a list of all operator-sets for an AVS address. This page supports pagination.',
	tags: ['AVS'],
	requestParams: {
		query: PaginationQuerySchema,
		path: AvsAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of operator-sets.',
			content: {
				'application/json': {
					schema: AvsOperatorSetsResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
