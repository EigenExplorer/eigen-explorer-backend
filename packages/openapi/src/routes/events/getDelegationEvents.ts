import z from '../../../../api/src/schema/zod'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { GlobalDelegationEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	DelegationEventQuerySchemaBase,
	refineDelegationTypeRestrictions,
	refineStartEndDates,
	refineWithEthValueRequiresTokenData
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import {
	WithTokenDataQuerySchema,
	WithEthValueQuerySchema
} from '../../../../api/src/schema/zod/schemas/withTokenDataQuery'

const CombinedQuerySchemaBase = z
	.object({})
	.merge(DelegationEventQuerySchemaBase)
	.merge(WithTokenDataQuerySchema)
	.merge(WithEthValueQuerySchema)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	refineStartEndDates,
	refineWithEthValueRequiresTokenData,
	refineDelegationTypeRestrictions
])

export const getDelegationEvents: ZodOpenApiOperationObject = {
	operationId: 'getDelegationEvents',
	summary: 'Retrieve all delegation events',
	description: 'Returns a list of all delegation events.',
	tags: ['Events'],
	requestParams: {
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The delegation events found.',
			content: {
				'application/json': {
					schema: GlobalDelegationEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
