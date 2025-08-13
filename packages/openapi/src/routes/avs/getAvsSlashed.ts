import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses'
import { AvsSlashedSchema } from '../../apiResponseSchema/operatorSet/operatorSetResponse'
import { AvsOperatorSetQuerySchema } from '../../../../api/src/schema/zod/schemas/operatorSetSchemas'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const AvsSlashingResponseSchema = z.object({
	data: z.array(AvsSlashedSchema),
	meta: PaginationMetaResponsesSchema
})

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

export const getAvsSlashed: ZodOpenApiOperationObject = {
	operationId: 'getAvsSlashed',
	summary: 'Retrieve all slashes for an AVS',
	description:
		'Returns a list of all slashing done for an AVS address. This page supports pagination.',
	tags: ['AVS'],
	requestParams: {
		query: AvsOperatorSetQuerySchema,
		path: AvsAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The list of slashes.',
			content: {
				'application/json': {
					schema: AvsSlashingResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
