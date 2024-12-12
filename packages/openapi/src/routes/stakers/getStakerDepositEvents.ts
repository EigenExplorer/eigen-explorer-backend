import z from '../../../../api/src/schema/zod'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { StakerDepositEventSchema } from '../../apiResponseSchema/events/eventsRespone'
import {
	DepositEventQuerySchemaBase,
	refineStartEndDates,
	refineWithEthValueRequiresTokenData
} from '../../../../api/src/schema/zod/schemas/eventSchemas'
import { applyAllRefinements } from '../../apiResponseSchema/events/util'

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x9791fdb4e9c0495efc5a1f3f9271ef226251eb34'
	})
})

const CombinedQuerySchemaBase = z
	.object({})
	.merge(DepositEventQuerySchemaBase)
	.merge(PaginationQuerySchema)
const CombinedQuerySchema = applyAllRefinements(CombinedQuerySchemaBase, [
	refineStartEndDates,
	refineWithEthValueRequiresTokenData
])

export const getStakerDepositEvents: ZodOpenApiOperationObject = {
	operationId: 'getStakerDepositEvents',
	summary: 'Retrieve all deposit events for a given Staker address',
	description: 'Returns a list of all deposit events for a given Staker address.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: CombinedQuerySchema
	},
	responses: {
		'200': {
			description: 'The deposit events found for the Staker.',
			content: {
				'application/json': {
					schema: StakerDepositEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
