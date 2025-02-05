import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { ZodOpenApiOperationObject } from 'zod-openapi'
import { AvsRewardsSchema } from '../../apiResponseSchema/avs/avsRewardsResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

const AvsAddressParam = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	})
})

export const getAvsRewards: ZodOpenApiOperationObject = {
	operationId: 'getAvsRewards',
	summary: 'Retrieve all rewards for a given AVS address',
	description: 'Returns a list of all rewards for a given AVS address.',
	tags: ['AVS'],
	requestParams: {
		path: AvsAddressParam,
		header: AuthHeaderSchema
	},
	responses: {
		'200': {
			description: 'The rewards found for the AVS.',
			content: {
				'application/json': {
					schema: AvsRewardsSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
