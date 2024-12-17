import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getAllStakers } from './getAllStakers'
import { getStakerByAddress } from './getStakerByAddress'
import { getStakerWithdrawals } from './getStakerWithdrawals'
import { getQueuedStakerWithdrawals } from './getQueuedStakerWithdrawals'
import { getQueuedWithdrawableStakerWithdrawals } from './getQueuedWithdrawableStakerWithdrawals'
import { getCompletedStakerWithdrawals } from './getCompletedStakerWithdrawals'
import { getStakerDeposits } from './getStakerDeposits'
import { getStakerDelegationEvents } from './getStakerDelegationEvents'
import { getStakerDepositEvents } from './getStakerDepositEvents'
import { getStakerWithdrawalEvents } from './getStakerWithdrawalEvents'

export const stakersRoutes: ZodOpenApiPathsObject = {
	'/stakers': { get: getAllStakers },
	'/stakers/{address}': { get: getStakerByAddress },
	'/stakers/{address}/withdrawals': {
		get: getStakerWithdrawals
	},
	'/stakers/{address}/withdrawals/queued': {
		get: getQueuedStakerWithdrawals
	},
	'/stakers/{address}/withdrawals/queued_withdrawable': {
		get: getQueuedWithdrawableStakerWithdrawals
	},
	'/stakers/{address}/withdrawals/completed': {
		get: getCompletedStakerWithdrawals
	},
	'/stakers/{address}/deposits': {
		get: getStakerDeposits
	},
	'/stakers/{address}/events/delegation': {
		get: getStakerDelegationEvents
	},
	'/stakers/{address}/events/deposit': {
		get: getStakerDepositEvents
	},
	'/stakers/{address}/events/withdrawal': {
		get: getStakerWithdrawalEvents
	}
}
