import z from '../../../../api/src/schema/zod'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { AvsRewardsEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	refineStartEndDates,
	RewardsEventQuerySchemaBase
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

const CombinedQuerySchemaBase = z
	.object({})
	.merge(RewardsEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [refineStartEndDates])

export const getAvsRewardsEvents: ZodOpenApiOperationObject = {
	operationId: 'getAvsRewardsEvents',
	summary: 'Retrieve all reward events for a given AVS address',
	description: 'Returns a list of all reward events for a given AVS address.',
	tags: ['AVS'],
	requestParams: {
		path: AvsAddressParam,
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The reward events found for the AVS.',
			content: {
				'application/json': {
					schema: AvsRewardsEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
