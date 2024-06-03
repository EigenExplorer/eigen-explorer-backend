import express from 'express'
import { getAllDeposits } from './depositController'

const router = express.Router()

router.get('/', getAllDeposits)

export default router
