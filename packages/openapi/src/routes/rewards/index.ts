import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getStrategies } from './getStrategies'

export const rewardsRoutes: ZodOpenApiPathsObject = {
	'/rewards/strategies': { get: getStrategies }
}
