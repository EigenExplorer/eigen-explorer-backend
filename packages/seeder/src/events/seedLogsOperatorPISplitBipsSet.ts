import prisma from '@prisma/client'
import { parseAbiItem } from 'viem'
import { getEigenContracts } from '../data/address'
import { getViemClient } from '../utils/viemClient'
import {
	bulkUpdateDbTransactions,
	fetchLastSyncBlock,
	getBlockDataFromDb,
	loopThroughBlocks
} from '../utils/seeder'
import { getPrismaClient } from '../utils/prismaClient'

const blockSyncKeyLogs = 'lastSyncedBlock_logs_operatorPiSplit'

export async function seedLogsOperatorPISplitBipsSet(toBlock?: bigint, fromBlock?: bigint) {
	const viemClient = getViemClient()
	const prismaClient = getPrismaClient()

	const firstBlock = fromBlock ? fromBlock : await fetchLastSyncBlock(blockSyncKeyLogs)
	const lastBlock = toBlock ? toBlock : await viemClient.getBlockNumber()

	await loopThroughBlocks(firstBlock, lastBlock, async (fromBlock, toBlock) => {
		const blockData = await getBlockDataFromDb(fromBlock, toBlock)
		try {
			const dbTransactions: any[] = []
			const logsOperatorPISplit: prisma.EventLogs_OperatorPISplitBipsSet[] = []

			const logs = await viemClient.getLogs({
				address: getEigenContracts().RewardsCoordinator,
				events: [
					parseAbiItem([
						'event OperatorPISplitBipsSet(address indexed caller, address indexed operator, uint32 activatedAt, uint16 oldOperatorPISplitBips, uint16 newOperatorPISplitBips)'
					])
				],
				fromBlock,
				toBlock
			})

			for (const log of logs) {
				logsOperatorPISplit.push({
					address: log.address,
					transactionHash: log.transactionHash,
					transactionIndex: log.logIndex,
					blockNumber: BigInt(log.blockNumber),
					blockHash: log.blockHash,
					blockTime: blockData.get(log.blockNumber) || new Date(0),

					caller: String(log.args.caller),
					operator: String(log.args.operator),
					activatedAt: BigInt(log.args.activatedAt || 0),
					oldOperatorPISplitBips: Number(log.args.oldOperatorPISplitBips),
					newOperatorPISplitBips: Number(log.args.newOperatorPISplitBips)
				})
			}

			dbTransactions.push(
				prismaClient.eventLogs_OperatorPISplitBipsSet.createMany({
					data: logsOperatorPISplit,
					skipDuplicates: true
				})
			)

			dbTransactions.push(
				prismaClient.settings.upsert({
					where: { key: blockSyncKeyLogs },
					update: { value: Number(toBlock) },
					create: { key: blockSyncKeyLogs, value: Number(toBlock) }
				})
			)

			const seedLength = logsOperatorPISplit.length

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Logs] Operator PI Split from: ${fromBlock} to: ${toBlock} size: ${seedLength}`
			)
		} catch {}
	})
}
