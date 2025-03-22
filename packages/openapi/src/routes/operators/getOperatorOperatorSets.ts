import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { OperatorSetsSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import {
	BaseOperatorSetQuerySchemaWithRegistered,
	requireAvsAddressForOperatorSetId
} from '../../../../api/src/schema/zod/schemas/operatorSetSchemas'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { AuthHeaderSchema } from '../../authHeaderSchema'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

const OperatorSetResponseSchema = z.object({
	data: z.array(OperatorSetsSchema),
	meta: PaginationMetaResponsesSchema
})

const CombinedQuerySchemaBase = z
	.object({})
	.merge(BaseOperatorSetQuerySchemaWithRegistered)
	.merge(PaginationQuerySchema)

const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	requireAvsAddressForOperatorSetId
])

export const getOperatorOperatorSets: ZodOpenApiOperationObject = {
	operationId: 'getOperatorOperatorSets',
	summary: 'Retrieve all operator-sets for an operator addresses',
	description:
		'Returns a list of all operator-sets for an operator addresses. This page supports pagination.',
	tags: ['Operators'],
	requestParams: {
		query: CombinedQuerySchema,
		path: OperatorAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of operator-sets.',
			content: {
				'application/json': {
					schema: OperatorSetResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
