import z from '../../../../api/src/schema/zod'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { GlobalDepositEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	DepositEventQuerySchemaBase,
	refineStartEndDates,
	refineWithEthValueRequiresTokenData
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const CombinedQuerySchemaBase = z
	.object({})
	.merge(DepositEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	refineStartEndDates,
	refineWithEthValueRequiresTokenData
])

export const getDepositEvents: ZodOpenApiOperationObject = {
	operationId: 'getDepositEvents',
	summary: 'Retrieve all deposit events',
	description: 'Returns a list of all deposit events.',
	tags: ['Events'],
	requestParams: {
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The deposit events found.',
			content: {
				'application/json': {
					schema: GlobalDepositEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
