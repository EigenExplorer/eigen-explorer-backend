import prisma from '@prisma/client'
import { getPrismaClient } from '../utils/prismaClient'
import { bulkUpdateDbTransactions } from '../utils/seeder'

const prismaClient = getPrismaClient()

export interface TransactionLog {
	address: string
	transactionHash: string
	transactionIndex: number
	blockNumber: bigint
	blockHash: string
	blockTime: Date
}

export interface AVSMetadataURIUpdatedLog {
	avs: string
	metadataURI: string
}

export interface OperatorAVSRegistrationStatusUpdatedLog {
	operator: string
	avs: string
	status: number
}

export interface OperatorMetadataURIUpdatedLog {
	operator: string
	metadataURI: string
}

export interface OperatorSharesIncreasedLog {
	operator: string
	staker: string
	strategy: string
	shares: string
}

export interface OperatorSharesDecreasedLog {
	operator: string
	staker: string
	strategy: string
	shares: string
}

export interface PodDeployedLog {
	eigenPod: string
	podOwner: string
}

export interface StakerDelegatedLog {
	staker: string
	operator: string
}

export interface StakerUndelegatedLog {
	staker: string
	operator: string
}

export async function updateTableAVSMetadataURIUpdated(
	dbTransactions: any[],
	avsMetadataURIUpdatedList: Map<TransactionLog, AVSMetadataURIUpdatedLog>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(
				prismaClient.eventLogs_AVSMetadataURIUpdated.deleteMany()
			)

			const newAvsMetadataURIUpdated: prisma.EventLogs_AVSMetadataURIUpdated[] =
				[]

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ avs, metadataURI }
			] of avsMetadataURIUpdatedList) {
				newAvsMetadataURIUpdated.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					avs,
					metadataURI
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_AVSMetadataURIUpdated.createMany({
					data: newAvsMetadataURIUpdated,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ avs, metadataURI }
			] of avsMetadataURIUpdatedList) {
				dbTransactions.push(
					prismaClient.eventLogs_AVSMetadataURIUpdated.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							avs,
							metadataURI
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorAVSRegistrationStatusUpdated(
	dbTransactions: any[],
	operatorAVSRegistrationStatusUpdatedList: Map<
		TransactionLog,
		OperatorAVSRegistrationStatusUpdatedLog
	>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(
				prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.deleteMany()
			)

			const newOperatorAVSRegistrationStatusUpdated: prisma.EventLogs_OperatorAVSRegistrationStatusUpdated[] =
				[]

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, avs, status }
			] of operatorAVSRegistrationStatusUpdatedList) {
				newOperatorAVSRegistrationStatusUpdated.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					operator,
					avs,
					status
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.createMany({
					data: newOperatorAVSRegistrationStatusUpdated,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, avs, status }
			] of operatorAVSRegistrationStatusUpdatedList) {
				dbTransactions.push(
					prismaClient.eventLogs_OperatorAVSRegistrationStatusUpdated.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							operator,
							avs,
							status
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorMetadataURIUpdated(
	dbTransactions: any[],
	operatorMetadataURIUpdatedList: Map<
		TransactionLog,
		OperatorMetadataURIUpdatedLog
	>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(
				prismaClient.eventLogs_OperatorMetadataURIUpdated.deleteMany()
			)

			const newOperatorMetadataURIUpdated: prisma.EventLogs_OperatorMetadataURIUpdated[] =
				[]

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, metadataURI }
			] of operatorMetadataURIUpdatedList) {
				newOperatorMetadataURIUpdated.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					operator,
					metadataURI
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorMetadataURIUpdated.createMany({
					data: newOperatorMetadataURIUpdated,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, metadataURI }
			] of operatorMetadataURIUpdatedList) {
				dbTransactions.push(
					prismaClient.eventLogs_OperatorMetadataURIUpdated.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							operator,
							metadataURI
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorSharesIncreased(
	dbTransactions: any[],
	operatorSharesIncreasedList: Map<TransactionLog, OperatorSharesIncreasedLog>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(
				prismaClient.eventLogs_OperatorSharesIncreased.deleteMany()
			)

			const newOperatorSharesIncreased: prisma.EventLogs_OperatorSharesIncreased[] =
				[]

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, staker, strategy, shares }
			] of operatorSharesIncreasedList) {
				newOperatorSharesIncreased.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					operator,
					staker,
					strategy,
					shares
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorSharesIncreased.createMany({
					data: newOperatorSharesIncreased,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, staker, strategy, shares }
			] of operatorSharesIncreasedList) {
				dbTransactions.push(
					prismaClient.eventLogs_OperatorSharesIncreased.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							operator,
							staker,
							strategy,
							shares
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorSharesDecreased(
	dbTransactions: any[],
	operatorSharesDecreasedList: Map<TransactionLog, OperatorSharesDecreasedLog>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(
				prismaClient.eventLogs_OperatorSharesDecreased.deleteMany()
			)

			const newOperatorSharesDecreased: prisma.EventLogs_OperatorSharesDecreased[] =
				[]

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, staker, strategy, shares }
			] of operatorSharesDecreasedList) {
				newOperatorSharesDecreased.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					operator,
					staker,
					strategy,
					shares
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorSharesDecreased.createMany({
					data: newOperatorSharesDecreased,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ operator, staker, strategy, shares }
			] of operatorSharesDecreasedList) {
				dbTransactions.push(
					prismaClient.eventLogs_OperatorSharesDecreased.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							operator,
							staker,
							strategy,
							shares
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTablePodDeployed(
	dbTransactions: any[],
	podDeployedList: Map<TransactionLog, PodDeployedLog>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(prismaClient.eventLogs_PodDeployed.deleteMany())

			const newPodDeployed: prisma.EventLogs_PodDeployed[] = []

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ eigenPod, podOwner }
			] of podDeployedList) {
				newPodDeployed.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					eigenPod,
					podOwner
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_PodDeployed.createMany({
					data: newPodDeployed,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ eigenPod, podOwner }
			] of podDeployedList) {
				dbTransactions.push(
					prismaClient.eventLogs_PodDeployed.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							eigenPod,
							podOwner
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableStakerDelegated(
	dbTransactions: any[],
	stakerDelegatedList: Map<TransactionLog, StakerDelegatedLog>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(prismaClient.eventLogs_StakerDelegated.deleteMany())

			const newStakerDelegated: prisma.EventLogs_StakerDelegated[] = []

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ staker, operator }
			] of stakerDelegatedList) {
				newStakerDelegated.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					staker,
					operator
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_StakerDelegated.createMany({
					data: newStakerDelegated,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ staker, operator }
			] of stakerDelegatedList) {
				dbTransactions.push(
					prismaClient.eventLogs_StakerDelegated.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							staker,
							operator
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableStakerUndelegated(
	dbTransactions: any[],
	stakerUndelegatedList: Map<TransactionLog, StakerUndelegatedLog>,
	dropTable: boolean = false
) {
	try {
		if (dropTable) {
			dbTransactions.push(prismaClient.eventLogs_StakerUndelegated.deleteMany())

			const newStakerUndelegated: prisma.EventLogs_StakerUndelegated[] = []

			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ staker, operator }
			] of stakerUndelegatedList) {
				newStakerUndelegated.push({
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime,
					staker,
					operator
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_StakerUndelegated.createMany({
					data: newStakerUndelegated,
					skipDuplicates: true
				})
			)
		} else {
			for (const [
				{
					address,
					transactionHash,
					transactionIndex,
					blockNumber,
					blockHash,
					blockTime
				},
				{ staker, operator }
			] of stakerUndelegatedList) {
				dbTransactions.push(
					prismaClient.eventLogs_StakerUndelegated.upsert({
						where: {
							transactionHash_transactionIndex: {
								transactionHash: transactionHash,
								transactionIndex: transactionIndex
							}
						},
						update: {},
						create: {
							address,
							transactionHash,
							transactionIndex,
							blockNumber,
							blockHash,
							blockTime,
							staker,
							operator
						}
					})
				)
			}
		}
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function getBlockDataFromDB(fromBlock: bigint, toBlock: bigint) {
	const blockData = await prismaClient.evm_BlockData.findMany({
		where: {
			number: {
				gte: BigInt(fromBlock),
				lte: BigInt(toBlock)
			}
		},
		select: {
			number: true,
			timestamp: true
		},
		orderBy: {
			number: 'asc'
		}
	})

	return new Map(blockData.map((block) => [block.number, block.timestamp]))
}
