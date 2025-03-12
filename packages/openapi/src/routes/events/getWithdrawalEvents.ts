import z from '../../../../api/src/schema/zod'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { GlobalWithdrawalEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	refineStartEndDates,
	refineWithdrawalTypeRestrictions,
	refineWithEthValueRequiresTokenData,
	WithdrawalEventQuerySchemaBase
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const CombinedQuerySchemaBase = z
	.object({})
	.merge(WithdrawalEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	refineStartEndDates,
	refineWithEthValueRequiresTokenData,
	refineWithdrawalTypeRestrictions
])

export const getWithdrawalEvents: ZodOpenApiOperationObject = {
	operationId: 'getWithdrawalEvents',
	summary: 'Retrieve all withdrawal events',
	description: 'Returns a list of all withdrawal events.',
	tags: ['Events'],
	requestParams: {
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The withdrawal events found.',
			content: {
				'application/json': {
					schema: GlobalWithdrawalEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
