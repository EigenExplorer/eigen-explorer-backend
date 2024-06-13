import prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import {
	baseBlock,
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	loopThroughBlocks,
	saveLastSyncBlock
} from './utils/seeder'

const blockSyncKey = 'lastSyncedBlock_validatorsRestake'
const blockSyncKeyLogs = 'lastSyncedBlock_logs_validatorRestake'

export async function seedValidatorsRestake(
	toBlock?: bigint,
	fromBlock?: bigint
) {
	const prismaClient = getPrismaClient()
	const validatorRestakeList: prisma.ValidatorRestake[] = []

	const firstBlock = fromBlock
		? fromBlock
		: await fetchLastSyncBlock(blockSyncKey)
	const lastBlock = toBlock
		? toBlock
		: await fetchLastSyncBlock(blockSyncKeyLogs)

	// Bail early if there is no block diff to sync
	if (lastBlock - firstBlock <= 0) {
		console.log(
			`[In Sync] [Data] Validator Restake from: ${firstBlock} to: ${lastBlock}`
		)
		return
	}

	// Loop through evm logs
	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const logs = await prismaClient.eventLogs_ValidatorRestaked.findMany({
			where: {
				blockNumber: {
					gt: fromBlock,
					lte: toBlock
				}
			}
		})

		for (const l in logs) {
			const log = logs[l]

			if (log.validatorIndex) {
				validatorRestakeList.push({
					podAddress: log.address.toLowerCase(),
					validatorIndex: log.validatorIndex,
					createdAtBlock: BigInt(log.blockNumber),
					createdAt: log.blockTime
				})
			}
		}

		console.log(
			`Validator restaked between blocks ${fromBlock} ${toBlock}: ${logs.length}`
		)
	})

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	if (validatorRestakeList.length > 0) {
		dbTransactions.push(
			prismaClient.validatorRestake.createMany({
				data: validatorRestakeList,
				skipDuplicates: true
			})
		)
	}

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Validator Restake from: ${firstBlock} to: ${lastBlock} size: ${validatorRestakeList.length}`
	)

	// Storing last synced block
	await saveLastSyncBlock(blockSyncKey, lastBlock)
}
