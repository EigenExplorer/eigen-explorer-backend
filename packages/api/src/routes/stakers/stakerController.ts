import type { Request, Response } from 'express'
import prisma from '../../utils/prismaClient'
import { holesky } from 'viem/chains'
import { handleAndReturnErrorResponse } from '../../schema/errors'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery'
import { WithTvlQuerySchema } from '../../schema/zod/schemas/withTvlQuery'
import { EthereumAddressSchema } from '../../schema/zod/schemas/base/ethereumAddress'
import { getNetwork, getViemClient } from '../../viem/viemClient'
import { fetchStrategyTokenPrices } from '../../utils/tokenPrices'
import {
	getStrategiesWithShareUnderlying,
	sharesToTVL
} from '../strategies/strategiesController'
import { getEigenContracts } from '../../data/address'

/**
 * Route to get a list of all stakers
 *
 * @param req
 * @param res
 */
export async function getAllStakers(req: Request, res: Response) {
	// Validate pagination query
	const result = PaginationQuerySchema.and(WithTvlQuerySchema).safeParse(
		req.query
	)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { skip, take, withTvl } = result.data

	try {
		// Fetch count and record
		const stakersCount = await prisma.staker.count()
		const stakersRecords = await prisma.staker.findMany({
			skip,
			take,
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			}
		})

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		const stakers = stakersRecords.map((staker) => ({
			...staker,
			createdAtBlock: Number(staker.createdAtBlock),
			updatedAtBlock: Number(staker.updatedAtBlock),
			tvl: withTvl
				? sharesToTVL(
						staker.shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
				  )
				: undefined
		}))

		res.send({
			data: stakers,
			meta: {
				total: stakersCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getStaker(req: Request, res: Response) {
	// Validate pagination query
	const result = WithTvlQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}
	const { withTvl } = result.data

	try {
		const { address } = req.params

		const staker = await prisma.staker.findUniqueOrThrow({
			where: { address: address.toLowerCase() },
			include: {
				shares: {
					select: { strategyAddress: true, shares: true }
				}
			}
		})

		const strategyTokenPrices = withTvl ? await fetchStrategyTokenPrices() : {}
		const strategiesWithSharesUnderlying = withTvl
			? await getStrategiesWithShareUnderlying()
			: []

		res.send({
			...staker,
			createdAtBlock: Number(staker.createdAtBlock),
			updatedAtBlock: Number(staker.updatedAtBlock),
			tvl: withTvl
				? sharesToTVL(
						staker.shares,
						strategiesWithSharesUnderlying,
						strategyTokenPrices
				  )
				: undefined
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawals(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { startBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				isCompleted: !!withdrawal.completedWithdrawal,
				createdAt: withdrawal.createdAt,
				updatedAt:
					withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock),
				updatedAtBlock:
					Number(withdrawal.completedWithdrawal?.createdAtBlock) ||
					Number(withdrawal.createdAtBlock)
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsQueued(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address, completedWithdrawal: null }

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { startBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock)
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsWithdrawable(
	req: Request,
	res: Response
) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params

		const viemClient = getViemClient()
		const minDelayBlocks = await prisma.settings.findUnique({
			where: { key: 'withdrawMinDelayBlocks' }
		})
		const minDelayBlock =
			(await viemClient.getBlockNumber()) -
			BigInt((minDelayBlocks?.value as string) || 0)

		const filterQuery = {
			stakerAddress: address,
			completedWithdrawal: null,
			startBlock: { lte: minDelayBlock }
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { startBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock)
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerWithdrawalsCompleted(
	req: Request,
	res: Response
) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = {
			stakerAddress: address,
			NOT: {
				completedWithdrawal: null
			}
		}

		const withdrawalCount = await prisma.withdrawalQueued.count({
			where: filterQuery
		})
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: filterQuery,
			include: {
				completedWithdrawal: true
			},
			skip,
			take,
			orderBy: { startBlock: 'desc' }
		})

		const data = withdrawalRecords.map((withdrawal) => {
			const shares = withdrawal.shares.map((s, i) => ({
				strategyAddress: withdrawal.strategies[i],
				shares: s
			}))

			return {
				...withdrawal,
				shares,
				strategies: undefined,
				completedWithdrawal: undefined,
				createdAt: withdrawal.createdAt,
				updatedAt:
					withdrawal.completedWithdrawal?.createdAt || withdrawal.createdAt,
				startBlock: Number(withdrawal.startBlock),
				createdAtBlock: Number(withdrawal.createdAtBlock),
				updatedAtBlock:
					Number(withdrawal.completedWithdrawal?.createdAtBlock) ||
					Number(withdrawal.createdAtBlock)
			}
		})

		res.send({
			data,
			meta: {
				total: withdrawalCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

export async function getStakerDeposits(req: Request, res: Response) {
	// Validate query
	const result = PaginationQuerySchema.safeParse(req.query)
	if (!result.success) {
		return handleAndReturnErrorResponse(req, res, result.error)
	}

	const { skip, take } = result.data

	try {
		const { address } = req.params
		const filterQuery = { stakerAddress: address }

		const depositCount = await prisma.deposit.count({
			where: filterQuery
		})
		const depositRecords = await prisma.deposit.findMany({
			where: filterQuery,
			skip,
			take,
			orderBy: { createdAtBlock: 'desc' }
		})

		const data = depositRecords.map((deposit) => {
			return {
				...deposit,
				createdAtBlock: Number(deposit.createdAtBlock)
			}
		})

		res.send({
			data,
			meta: {
				total: depositCount,
				skip,
				take
			}
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

/**
 * Retrieve restaked points data for a given address
 *
 * @param req
 * @param res
 * @returns
 */
export async function getRestakedPoints(req: Request, res: Response) {
	// Validate query
	const paramCheck = EthereumAddressSchema.safeParse(req.params.address)
	if (!paramCheck.success) {
		return handleAndReturnErrorResponse(req, res, paramCheck.error)
	}

	const { address } = req.params

	const beaconAddress = '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0'
	const eigenStrategyAddress =
		getEigenContracts().Strategies.Eigen?.strategyContract

	// Here, exclude all strategies for which restaked points are disabled
	const strategyToTokenMap = Object.values(
		getEigenContracts().Strategies
	).reduce((map, obj) => {
		if (obj.strategyContract !== eigenStrategyAddress) {
			map[obj.strategyContract.toLowerCase()] = obj.tokenContract.toLowerCase()
		}
		return map
	}, {})

	try {
		// All LST deposits
		const depositRecords = await prisma.deposit.findMany({
			where: {
				stakerAddress: address.toLowerCase()
			},
			select: {
				strategyAddress: true,
				shares: true,
				createdAt: true
			},
			orderBy: { createdAt: 'asc' }
		})

		// All beacon deposits
		const beaconDepositRecords: {
			activationEpoch: bigint
		}[] = await getBeaconEthData(address)

		// All completed withdrawals
		const withdrawalRecords = await prisma.withdrawalQueued.findMany({
			where: {
				stakerAddress: address,
				completedWithdrawal: {
					receiveAsTokens: true
				}
			},
			include: {
				completedWithdrawal: true
			},
			orderBy: {
				completedWithdrawal: {
					createdAt: 'asc'
				}
			}
		})

		const now = Number(new Date())
		// Store total ETH ⋅ hours of beacon ETH & each LST strategy from deposit time to current time
		const depositsSumByToken = {}
		for (const deposit of depositRecords) {
			const strategyAddress = deposit.strategyAddress.toLowerCase()
			const tokenAddress = strategyToTokenMap[strategyAddress]

			if (tokenAddress) {
				const shares = Number(deposit.shares) / 1e18
				const timeDiff = (now - Number(deposit.createdAt)) / (1000 * 60 * 60)
				const sharesTimeProduct = Number(shares) * Math.round(timeDiff)

				if (!depositsSumByToken[tokenAddress]) {
					depositsSumByToken[tokenAddress] = 0
				}
				depositsSumByToken[tokenAddress] += sharesTimeProduct
			}
		}

		if (beaconDepositRecords.length > 0) {
			const firstEpoch = getFirstEpoch()
			const beaconDepositsSum = beaconDepositRecords.reduce((acc, record) => {
				const activatedAt = Number(record.activationEpoch) * 384000 + firstEpoch
				const shares = Number(32)
				const timeDiff = (now - Number(activatedAt)) / (1000 * 60 * 60)
				return acc + Number(shares) * Math.round(timeDiff)
			}, 0)
			strategyToTokenMap[beaconAddress] = beaconAddress
			depositsSumByToken[beaconAddress] = beaconDepositsSum
		}

		// Store total ETH ⋅ hours for beacon ETH & each LST strategy from withdrawal time to current time
		const withdrawalsSumByToken = {}
		for (const withdrawal of withdrawalRecords) {
			for (let i = 0; i < withdrawal.strategies.length; i++) {
				const strategyAddress = withdrawal.strategies[i].toLowerCase()
				const tokenAddress = strategyToTokenMap[strategyAddress]

				if (tokenAddress) {
					const shares = Number(withdrawal.shares[i]) / 1e18
					const timeDiff =
						(now - Number(withdrawal.createdAt)) / (1000 * 60 * 60)
					const sharesTimeProduct = shares * Math.round(timeDiff)

					if (!withdrawalsSumByToken[tokenAddress]) {
						withdrawalsSumByToken[tokenAddress] = 0
					}
					withdrawalsSumByToken[tokenAddress] += sharesTimeProduct
				}
			}
		}

		const allTokenAddresses = new Set(Object.keys(depositsSumByToken))
		const participationMeasuresByToken = {}
		let totalParticipationMeasure = 0

		// For each token, calculate difference in total ETH ⋅ hours between deposits and withdrawals
		for (const address of allTokenAddresses) {
			const depositSum = depositsSumByToken[address] || 0
			const withdrawalSum = withdrawalsSumByToken[address] || 0
			const netSum = depositSum - withdrawalSum

			if (!participationMeasuresByToken[address]) {
				participationMeasuresByToken[address] = 0
			}
			participationMeasuresByToken[address] += netSum
			totalParticipationMeasure += netSum
		}

		// Send response
		const restakedPoints = Object.keys(participationMeasuresByToken).map(
			(tokenAddress) => ({
				tokenAddress,
				participationMeasure:
					participationMeasuresByToken[tokenAddress].toString()
			})
		)

		res.json({
			stakerAddress: address,
			restakedPoints,
			totalParticipationMeasure: totalParticipationMeasure.toString()
		})
	} catch (error) {
		handleAndReturnErrorResponse(req, res, error)
	}
}

// Helper functions

/**
 * Retrieve all beacon ETH deposit data for a given address
 *
 * @param address
 * @returns
 */
async function getBeaconEthData(address: string) {
	const podRecords = await prisma.pod.findMany({
		where: {
			owner: address
		},
		select: {
			address: true
		}
	})

	return await prisma.validator.findMany({
		where: {
			withdrawalCredentials: {
				in: podRecords.map((pod) => {
					return `0x010000000000000000000000${pod.address.substring(2)}`
				})
			}
		},
		select: {
			activationEpoch: true
		}
	})
}

function getFirstEpoch() {
	return getNetwork() === holesky ? 1695902400000 : 1606824023000
}
