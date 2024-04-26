import express from 'express'
import { getAllStakers, getStaker } from './stakerController'

const router = express.Router()

router.get('/', getAllStakers)

router.get('/:id', getStaker)

export default router
