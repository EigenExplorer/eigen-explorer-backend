import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getDelegationEvents } from './getDelegationEvents'
import { getDepositEvents } from './getDepositEvents'
import { getRewardsEvents } from './getRewardsEvents'
import { getWithdrawalEvents } from './getWithdrawalEvents'

export const eventRoutes: ZodOpenApiPathsObject = {
	'/events/delegation': { get: getDelegationEvents },
	'/events/rewards': { get: getRewardsEvents },
	'/events/deposit': { get: getDepositEvents },
	'/events/withdrawal': { get: getWithdrawalEvents }
}