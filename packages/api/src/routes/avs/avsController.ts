import prisma from '../../utils/prismaClient'
import type { Request, Response } from 'express'
import { PaginationQuerySchema } from '../../schema/generic'
import { getEigenContracts } from '../../data/address'

/**
 * Route to get a list of all AVSs
 *
 * @param req
 * @param res
 */
export async function getAllAVS(req: Request, res: Response) {
	try {
		// Validate pagination query
		const {
			error,
			value: { skip, take }
		} = PaginationQuerySchema.validate(req.query)
		if (error) return res.status(422).json({ error: error.details[0].message })

		// Fetch count and record
		const avsCount = await prisma.avs.count()
		const avsRecords = await prisma.avs.findMany({
			skip,
			take,
			include: { operators: true }
		})

		const data = await Promise.all(
			avsRecords.map(async (avs) => {
				const operatorAddresses = avs.operators
					.filter((o) => o.isActive)
					.map((o) => o.operatorAddress)

				const totalOperators = operatorAddresses.length
				const totalStakers = await prisma.staker.count({
					where: { operatorAddress: { in: operatorAddresses } }
				})

				return {
					...avs,
					totalOperators,
					totalStakers,
					operators: undefined
				}
			})
		)

		res.send({
			data,
			meta: {
				total: avsCount,
				skip,
				take
			}
		})
	} catch (error) {
		res.status(400).send({
			error: 'An error occurred while fetching data'
		})
	}
}

/**
 * Route to get a list of all AVS and their addresses
 *
 * @param req
 * @param res
 */
export async function getAllAVSAddresses(req: Request, res: Response) {
	try {
		// Validate pagination query
		const {
			error,
			value: { skip, take }
		} = PaginationQuerySchema.validate(req.query)
		if (error) return res.status(422).json({ error: error.details[0].message })

		// Fetch count and records
		const avsCount = await prisma.avs.count()
		const avsRecords = await prisma.avs.findMany({ skip, take })

		// Simplified map (assuming avs.address is not asynchronous)
		const data = avsRecords.map((avs) => ({
			name: avs.metadataName,
			address: avs.address
		}))

		// Send response with data and metadata
		res.send({
			data,
			meta: {
				total: avsCount,
				skip,
				take
			}
		})
	} catch (error) {
		res.status(400).send({
			error: 'An error occurred while fetching data'
		})
	}
}

/**
 * Route to get a single AVS
 *
 * @param req
 * @param res
 */
export async function getAVS(req: Request, res: Response) {
	try {
		const { id } = req.params
		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: id },
			include: { operators: true }
		})

		const strategyKeys = Object.keys(getEigenContracts().Strategies)
		const strategyContracts = strategyKeys.map((s) =>
			getEigenContracts().Strategies[s].strategyContract.toLowerCase()
		) as `0x${string}`[]
		strategyContracts.push('0xbeaC0eeEeeeeEEeEeEEEEeeEEeEeeeEeeEEBEaC0')

		const shares = strategyContracts.map((sc) => ({
			shares: '0',
			strategy: sc
		}))

		const operatorAddresses = avs.operators
			.filter((o) => o.isActive)
			.map((o) => o.operatorAddress)

		const operatorRecords = await prisma.operator.findMany({
			where: { address: { in: operatorAddresses } },
			select: { shares: true }
		})

		let tvl = 0
		const totalOperators = operatorAddresses.length
		const totalStakers = await prisma.staker.count({
			where: { operatorAddress: { in: operatorAddresses } }
		})

		operatorRecords.map((o) => {
			o.shares.map((os) => {
				const foundShare = shares.find(
					(s) => s.strategy.toLowerCase() === os.strategyAddress.toLowerCase()
				)

				if (foundShare) {
					const shares = BigInt(foundShare.shares) + BigInt(os.shares)
					foundShare.shares = shares.toString()
				}

				tvl += Number(os.shares) / 1e18
			})
		})

		res.send({
			...avs,
			shares,
			tvl,
			totalOperators,
			totalStakers,
			operators: undefined
		})
	} catch (error) {
		res.status(400).send({
			error: 'An error occurred while fetching data'
		})
	}
}

export async function getAVSStakers(req: Request, res: Response) {
	try {
		// Validate pagination query
		const {
			error,
			value: { skip, take }
		} = PaginationQuerySchema.validate(req.query)
		if (error) return res.status(422).json({ error: error.details[0].message })

		const { id } = req.params
		const avs = await prisma.avs.findUniqueOrThrow({
			where: { address: id },
			include: { operators: true }
		})

		const operatorAddresses = avs.operators
			.filter((o) => o.isActive)
			.map((o) => o.operatorAddress)

		const stakersCount = await prisma.staker.count({
			where: { operatorAddress: { in: operatorAddresses } }
		})

		const stakersRecords = await prisma.staker.findMany({
			where: { operatorAddress: { in: operatorAddresses } },
			skip,
			take,
			include: { shares: true }
		})

		const data = await Promise.all(
			stakersRecords.map((staker) => {
				let tvl = 0

				staker.shares.map((ss) => {
					tvl += Number(BigInt(ss.shares)) / 1e18
				})

				return {
					...staker,
					tvl
				}
			})
		)

		res.send({
			data,
			meta: {
				total: stakersCount,
				skip,
				take
			}
		})
	} catch (error) {
		res.status(400).send({
			error: 'An error occurred while fetching data'
		})
	}
}
