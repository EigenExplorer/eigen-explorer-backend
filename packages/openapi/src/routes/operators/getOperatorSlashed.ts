import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import {
	BaseOperatorSetObjectSchema,
	requireAvsAddressForOperatorSetId
} from '../../../../api/src/schema/zod/schemas/operatorSetSchemas'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { OperatorSlashedSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const OperatorSlashingResponseSchema = z.object({
	data: z.array(OperatorSlashedSchema),
	meta: PaginationMetaResponsesSchema
})

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

const CombinedQuerySchemaBase = z
	.object({})
	.merge(BaseOperatorSetObjectSchema)
	.merge(PaginationQuerySchema)

const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	requireAvsAddressForOperatorSetId
])

export const getOperatorSlashed: ZodOpenApiOperationObject = {
	operationId: 'getOperatorSlashed',
	summary: 'Retrieve all slashes for an operator addresses',
	description:
		'Returns a list of all slashes for an operator addresses. This page supports pagination.',
	tags: ['Operators'],
	requestParams: {
		query: CombinedQuerySchema,
		path: OperatorAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The ist of slashes.',
			content: {
				'application/json': {
					schema: OperatorSlashingResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
