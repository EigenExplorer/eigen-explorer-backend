import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getStrategies } from './getStrategies'
import { getProgrammaticIncentives } from './getProgrammaticIncentives'

export const rewardsRoutes: ZodOpenApiPathsObject = {
	'/rewards/strategies': { get: getStrategies },
	'/rewards/programmatic-incentives': { get: getProgrammaticIncentives }
}
