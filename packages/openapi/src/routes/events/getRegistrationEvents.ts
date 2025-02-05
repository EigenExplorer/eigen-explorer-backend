import z from '../../../../api/src/schema/zod'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { GlobalRegistrationEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	refineStartEndDates,
	RegistrationEventQuerySchemaBase
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const CombinedQuerySchemaBase = z
	.object({})
	.merge(RegistrationEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [refineStartEndDates])

export const getRegistrationsEvents: ZodOpenApiOperationObject = {
	operationId: 'getRegistrationEvents',
	summary: 'Retrieve all registration events',
	description: 'Returns a list of all registration events.',
	tags: ['Events'],
	requestParams: {
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The registration events found.',
			content: {
				'application/json': {
					schema: GlobalRegistrationEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
