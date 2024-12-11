import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { OperatorDelegationEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	OperatorDelegationEventQuerySchemaBase,
	refineDelegationTypeRestrictions,
	refineStartEndDates,
	refineWithEthValueRequiresTokenData
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'

const OperatorAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1a'
	})
})

const CombinedQuerySchemaBase = z
	.object({})
	.merge(OperatorDelegationEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	refineStartEndDates,
	refineWithEthValueRequiresTokenData,
	refineDelegationTypeRestrictions
])

export const getOperatorDelegationEvents: ZodOpenApiOperationObject = {
	operationId: 'getOperatorDelegationEvents',
	summary: 'Retrieve delegation events for a given Operator address',
	description: 'Returns a list of all delegation events for a given Operator address.',
	tags: ['Operators'],
	requestParams: {
		path: OperatorAddressParam,
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The delegation events found for the Operator.',
			content: {
				'application/json': {
					schema: OperatorDelegationEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
