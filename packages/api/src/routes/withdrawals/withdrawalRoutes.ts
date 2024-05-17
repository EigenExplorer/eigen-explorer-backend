import express from 'express'
import { getAllWithdrawals, getWithdrawal } from './withdrawalController'

const router = express.Router()

router.get('/', getAllWithdrawals)

router.get('/:withdrawalRoot', getWithdrawal)

export default router
