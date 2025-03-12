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
import { AuthHeaderSchema } from '../../authHeaderSchema'

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0xd4fcde9bb1d746Dd7e5463b01Dd819EE06aF25db'
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
	summary: 'Retrieve all deposit events for a given staker address',
	description: 'Returns a list of all deposit events for a given staker address.',
	tags: ['Stakers'],
	requestParams: {
		path: StakerAddressParam,
		query: CombinedQuerySchema,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The deposit events found for the staker.',
			content: {
				'application/json': {
					schema: StakerDepositEventSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
