import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { StakerResponseSchema } from '../../apiResponseSchema/stakerResponse'

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x00107cfdeaddc0a3160ed2f6fedd627f313e7b1b'
	})
})

export const getStakerByAddress: ZodOpenApiOperationObject = {
	operationId: 'getStakerByAddress',
	summary: 'Retrieve a staker by address',
	description: 'Returns a staker record by address.',
	tags: ['Stakers'],
	requestParams: {
		query: WithTvlQuerySchema,
		path: StakerAddressParam
	},
	responses: {
		'200': {
			description: 'The record of the requested operator.',
			content: {
				'application/json': {
					schema: StakerResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
