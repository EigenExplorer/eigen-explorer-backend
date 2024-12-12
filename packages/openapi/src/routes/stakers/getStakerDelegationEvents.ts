import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { StakerDelegationEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	refineDelegationTypeRestrictions,
	refineStartEndDates,
	refineWithEthValueRequiresTokenData,
	StakerDelegationEventQuerySchemaBase
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x9791fdb4e9c0495efc5a1f3f9271ef226251eb34'
	})
})

const CombinedQuerySchemaBase = z
	.object({})
	.merge(StakerDelegationEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	refineStartEndDates,
	refineWithEthValueRequiresTokenData,
	refineDelegationTypeRestrictions
])

export const getStakerDelegationEvents: ZodOpenApiOperationObject = {
	operationId: 'getStakerDelegationEvents',
	summary: 'Retrieve all delegation events for a given Staker address',
	description: 'Returns a list of all delegation events for a given Staker address.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The delegation events found for the Staker.',
			content: {
				'application/json': {
					schema: StakerDelegationEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
