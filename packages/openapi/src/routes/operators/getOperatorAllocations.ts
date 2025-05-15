import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import {
	BaseOperatorAllocationQuerySchema,
	requireAvsAddressForOperatorSetId
} from '../../../../api/src/schema/zod/schemas/operatorSetSchemas'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { OperatorAllocationsSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const OperatorAllocationsResponseSchema = z.object({
	data: z.array(OperatorAllocationsSchema),
	meta: PaginationMetaResponsesSchema
})

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

const CombinedQuerySchemaBase = z
	.object({})
	.merge(BaseOperatorAllocationQuerySchema)
	.merge(PaginationQuerySchema)

const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	requireAvsAddressForOperatorSetId
])

export const getOperatorAllocations: ZodOpenApiOperationObject = {
	operationId: 'getOperatorAllocations',
	summary: 'Retrieve all allocations for an operator addresses',
	description:
		'Returns a list of all allocations for an operator addresses. This page supports pagination.',
	tags: ['Operators'],
	requestParams: {
		query: CombinedQuerySchema,
		path: OperatorAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of allocations.',
			content: {
				'application/json': {
					schema: OperatorAllocationsResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
