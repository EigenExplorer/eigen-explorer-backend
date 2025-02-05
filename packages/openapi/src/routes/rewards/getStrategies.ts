import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import { RewardsTokenSchema } from '../../apiResponseSchema/base/rewardTokensResponse'
import { AuthHeaderSchema } from '../../authHeaderSchema'

export const getStrategies: ZodOpenApiOperationObject = {
	operationId: 'getStrategies',
	summary: 'Retrieve all strategies with their reward tokens',
	description:
		'Returns a list of strategies with their corresponding reward tokens, including strategy addresses and associated token addresses.',
	tags: ['Rewards'],
	requestParams: { header: AuthHeaderSchema },
	responses: {
		'200': {
			description: 'List of strategies along with associated reward tokens.',
			content: {
				'application/json': {
					schema: RewardsTokenSchema
				}
			}
		},
		...openApiErrorResponses
	}
}
