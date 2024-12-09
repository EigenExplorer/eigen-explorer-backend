import express from 'express'
import {
	getAllStakers,
	getStaker,
	getStakerWithdrawals,
	getStakerWithdrawalsCompleted,
	getStakerWithdrawalsQueued,
	getStakerWithdrawalsWithdrawable,
	getStakerDeposits,
	getStakerDelegationEvents,
	getStakerDepositEvents,
	getStakerWithdrawalEvents
} from './stakerController'

const router = express.Router()

router.get('/', getAllStakers)

router.get('/:address', getStaker)

router.get('/:address/withdrawals', getStakerWithdrawals)
router.get('/:address/withdrawals/queued', getStakerWithdrawalsQueued)
router.get('/:address/withdrawals/queued_withdrawable', getStakerWithdrawalsWithdrawable)
router.get('/:address/withdrawals/completed', getStakerWithdrawalsCompleted)

router.get('/:address/deposits', getStakerDeposits)

router.get('/:address/events/delegation', getStakerDelegationEvents)
router.get('/:address/events/deposit', getStakerDepositEvents)
router.get('/:address/events/withdrawal', getStakerWithdrawalEvents)

export default router
