import type { Request, Response } from 'express'
import prisma from '../../prisma/prismaClient'
import { PaginationQuerySchema } from '../../schema/generic'
import publicViemClient from '../../viem/viemClient'
import { getContract } from 'viem'
import { delegationManagerAbi } from '../../data/abi/delegationManager'
import {
	eigenHoleskyContractAddresses,
	eigenLayerHoleskyStrategyContracts
} from '../../data/address/eigenHoleskyContracts'

/**
 * Route to get a list of all operators
 *
 * @param req
 * @param res
 */
export async function getAllOperators(req: Request, res: Response) {
	try {
		// Validate pagination query
		const {
			error,
			value: { skip, take }
		} = PaginationQuerySchema.validate(req.query)
		if (error) return res.status(422).json({ error: error.details[0].message })

		// Fetch count and record
		const operatorCount = await prisma.operator.count()
		const operatorRecords = await prisma.operator.findMany({ skip, take })

		res.send({
			data: operatorRecords,
			meta: {
				total: operatorCount,
				skip,
				take
			}
		})
	} catch (error) {
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}

/**
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getOperator(req: Request, res: Response) {
	try {
		const { id } = req.params

		const operator = await prisma.operator.findUniqueOrThrow({
			where: { address: id }
		})

		res.send({ ...operator, shares: await getOperatorShares(operator.address) })
	} catch (error) {
		console.log(error)
		res.status(400).send({ error: 'An error occurred while fetching data' })
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function getOperatorShares(operatorAddress: string): Promise<any> {
	const contract = getContract({
		address: eigenHoleskyContractAddresses.DelegationManager,
		abi: delegationManagerAbi,
		client: publicViemClient
	})

	const strategyKeys = Object.keys(eigenLayerHoleskyStrategyContracts)
	const strategyContracts = strategyKeys.map(
		(s) => eigenLayerHoleskyStrategyContracts[s].strategyContract
	) as `0x${string}`[]

	const shares = (await contract.read.getOperatorShares([
		operatorAddress,
		strategyContracts
	])) as bigint[]

	return shares.map((share, i) => ({
		shares: share.toString(),
		strategy: strategyContracts[i]
	}))
}
