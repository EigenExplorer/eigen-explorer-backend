import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery'
import { StakerRewardsResponseSchema } from '../../apiResponseSchema/stakerResponse'
import { WithRewardsQuerySchema } from '../../../../api/src/schema/zod/schemas/withRewardsQuery'

const CombinedQuerySchema = z.object({}).merge(WithTvlQuerySchema).merge(WithRewardsQuerySchema)

const StakerAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the staker').openapi({
		example: '0x9791fdb4e9c0495efc5a1f3f9271ef226251eb34'
	})
})

export const getStakerByAddress: ZodOpenApiOperationObject = {
	operationId: 'getStakerByAddress',
	summary: 'Retrieve a staker by address',
	description: 'Returns a staker record by address.',
	tags: ['Stakers'],
	requestParams: {
		query: CombinedQuerySchema,
		path: StakerAddressParam
	},
	responses: {
		'200': {
			description: 'The record of the requested operator.',
			content: {
				'application/json': {
					schema: StakerRewardsResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
