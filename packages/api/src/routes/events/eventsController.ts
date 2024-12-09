import type { Request, Response } from 'express'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import {
	DelegationEventQuerySchema,
	DepositEventQuerySchema,
	RewardsEventQuerySchema,
	WithdrawalEventQuerySchema
} from '../../schema/zod/schemas/eventSchemas'
import {
	fetchDelegationEvents,
	fetchDepositEvents,
	fetchGlobalWithdrawalEvents,
	fetchRewardsEvents
} from '../../utils/eventUtils'
import {
	WithEthValueQuerySchema,
	WithIndividualAmountQuerySchema
} from '../../schema/zod/schemas/withTokenDataQuery'

/**
 * Function for route /events/delegation
 * Fetches and returns a list of delegation-related events
 *
 * @param req
 * @param res
 */
export async function getDelegationEvents(req: Request, res: Response) {
	const result = DelegationEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const {
			type,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data

		const response = await fetchDelegationEvents({
			type,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		})

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /events/rewards
 * Fetches and returns a list of rewards-related events
 *
 * @param req
 * @param res
 */
export async function getRewardsEvents(req: Request, res: Response) {
	const result = RewardsEventQuerySchema.and(WithEthValueQuerySchema)
		.and(WithIndividualAmountQuerySchema)
		.and(PaginationQuerySchema)
		.safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const {
			rewardsSubmissionToken,
			rewardsSubmissionHash,
			startAt,
			endAt,
			withEthValue,
			withIndividualAmount,
			skip,
			take
		} = result.data

		const response = await fetchRewardsEvents({
			rewardsSubmissionToken,
			rewardsSubmissionHash,
			startAt,
			endAt,
			withEthValue,
			withIndividualAmount,
			skip,
			take
		})

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /events/deposit
 * Fetches and returns a list of deposit-related events
 *
 * @param req
 * @param res
 */
export async function getDepositEvents(req: Request, res: Response) {
	const result = DepositEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const {
			tokenAddress,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		} = result.data

		const response = await fetchDepositEvents({
			tokenAddress,
			strategyAddress,
			txHash,
			startAt,
			endAt,
			withTokenData,
			withEthValue,
			skip,
			take
		})

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Function for route /events/withdrawal
 * Fetches and returns a list of withdrawal-related events
 *
 * @param req
 * @param res
 */
export async function getWithdrawalEvents(req: Request, res: Response) {
	const result = WithdrawalEventQuerySchema.and(PaginationQuerySchema).safeParse(req.query)
	if (!result.success) return handleAndReturnErrorResponse(req, res, result.error)

	try {
		const {
			type,
			txHash,
			startAt,
			endAt,
			withdrawalRoot,
			delegatedTo,
			withdrawer,
			skip,
			take,
			withTokenData,
			withEthValue
		} = result.data

		const response = await fetchGlobalWithdrawalEvents({
			type,
			txHash,
			startAt,
			endAt,
			withdrawalRoot,
			delegatedTo,
			withdrawer,
			skip,
			take,
			withTokenData,
			withEthValue
		})

		res.send({
			data: response.eventRecords,
			meta: { total: response.total, skip, take }
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}
