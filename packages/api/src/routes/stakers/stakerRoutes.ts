import express from 'express'
import { getAllStakers, getStaker } from './stakerController'

const router = express.Router()

router.get('/', getAllStakers)

router.get('/:address', getStaker)

export default router
