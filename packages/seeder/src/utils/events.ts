import type prisma from '@prisma/client'
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
	avs: `0x${string}` | undefined
	metadataURI: string | undefined
}

export interface OperatorAVSRegistrationStatusUpdatedLog {
	operator: `0x${string}` | undefined
	avs: `0x${string}` | undefined
	status: number
}

export interface OperatorMetadataURIUpdatedLog {
	operator: `0x${string}` | undefined
	metadataURI: string | undefined
}

export interface OperatorSharesIncreasedLog {
	operator: `0x${string}` | undefined
	staker: `0x${string}` | undefined
	strategy: `0x${string}` | undefined
	shares: string
}

export interface OperatorSharesDecreasedLog {
	operator: `0x${string}` | undefined
	staker: `0x${string}` | undefined
	strategy: `0x${string}` | undefined
	shares: string
}

export interface PodDeployedLog {
	eigenPod: `0x${string}` | undefined
	podOwner: `0x${string}` | undefined
}

export interface StakerDelegatedLog {
	staker: `0x${string}` | undefined
	operator: `0x${string}` | undefined
}

export interface StakerUndelegatedLog {
	staker: `0x${string}` | undefined
	operator: `0x${string}` | undefined
}

export async function updateTableAVSMetadataURIUpdated(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	avsMetadataURIUpdatedList: Map<TransactionLog, AVSMetadataURIUpdatedLog>
) {
	try {
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
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorAVSRegistrationStatusUpdated(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	operatorAVSRegistrationStatusUpdatedList: Map<
		TransactionLog,
		OperatorAVSRegistrationStatusUpdatedLog
	>
) {
	try {
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
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorMetadataURIUpdated(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	operatorMetadataURIUpdatedList: Map<
		TransactionLog,
		OperatorMetadataURIUpdatedLog
	>
) {
	try {
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
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorSharesIncreased(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	operatorSharesIncreasedList: Map<TransactionLog, OperatorSharesIncreasedLog>
) {
	try {
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
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableOperatorSharesDecreased(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	operatorSharesDecreasedList: Map<TransactionLog, OperatorSharesDecreasedLog>
) {
	try {
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
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTablePodDeployed(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	podDeployedList: Map<TransactionLog, PodDeployedLog>
) {
	try {
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
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableStakerDelegated(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	stakerDelegatedList: Map<TransactionLog, StakerDelegatedLog>
) {
	try {
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
	} catch {}

	await bulkUpdateDbTransactions(dbTransactions)
}

export async function updateTableStakerUndelegated(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	dbTransactions: any[],
	stakerUndelegatedList: Map<TransactionLog, StakerUndelegatedLog>
) {
	try {
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
