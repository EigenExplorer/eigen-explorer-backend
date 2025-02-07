import z from '../../../../api/src/schema/zod'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { GlobalRewardsEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	refineStartEndDates,
	RewardsEventQuerySchemaBase
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const CombinedQuerySchemaBase = z
	.object({})
	.merge(RewardsEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [refineStartEndDates])

export const getRewardsEvents: ZodOpenApiOperationObject = {
	operationId: 'getRewardsEvents',
	summary: 'Retrieve all reward events',
	description: 'Returns a list of all reward events.',
	tags: ['Events'],
	requestParams: {
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The reward events found.',
			content: {
				'application/json': {
					schema: GlobalRewardsEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
