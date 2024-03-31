import express from 'express'
import { getAllOperators, getOperator } from './operatorController.js'

const router = express.Router()

// API routes for /operators
router.get('/', getAllOperators)
router.get('/:id', getOperator)

export default router
