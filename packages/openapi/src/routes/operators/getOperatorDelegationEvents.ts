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
		example: '0xDbEd88D83176316fc46797B43aDeE927Dc2ff2F5'
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
	summary: 'Retrieve all delegation events for a given operator address',
	description: 'Returns a list of all delegation events for a given operator address.',
	tags: ['Operators'],
	requestParams: {
		path: OperatorAddressParam,
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The delegation events found for the operator.',
			content: {
				'application/json': {
					schema: OperatorDelegationEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
