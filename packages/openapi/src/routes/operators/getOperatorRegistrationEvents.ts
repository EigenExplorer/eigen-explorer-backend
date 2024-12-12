import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { OperatorRegistrationEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	OperatorRegistrationEventQuerySchemaBase,
	refineStartEndDates
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
	.merge(OperatorRegistrationEventQuerySchemaBase)
	.merge(PaginationQuerySchema)

const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [refineStartEndDates])

export const getOperatorRegistrationEvents: ZodOpenApiOperationObject = {
	operationId: 'getOperatorRegistrationEvents',
	summary: 'Retrieve all registration events for a given operator address',
	description: 'Returns a list of all registration events for a given operator address.',
	tags: ['Operators'],
	requestParams: {
		path: OperatorAddressParam,
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The registration events found for the operator.',
			content: {
				'application/json': {
					schema: OperatorRegistrationEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
