import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { AvsAllocationQuerySchema } from '../../../../api/src/schema/zod/schemas/operatorSetSchemas'
import { AvsAllocationsSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const AvsAllocationsResponseSchema = z.object({
	data: z.array(AvsAllocationsSchema),
	meta: PaginationMetaResponsesSchema
})

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

export const getAvsAllocations: ZodOpenApiOperationObject = {
	operationId: 'getAvsAllocations',
	summary: 'Retrieve all allocations for an AVS',
	description:
		'Returns a list of all allocations for an AVS address. This page supports pagination.',
	tags: ['AVS'],
	requestParams: {
		query: AvsAllocationQuerySchema,
		path: AvsAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of allocations.',
			content: {
				'application/json': {
					schema: AvsAllocationsResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
