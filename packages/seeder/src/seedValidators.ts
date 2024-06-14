import 'dotenv/config'

import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'

import { chunkArray } from './utils/array'

export async function seedValidators(shouldClearPrev?: boolean) {
	const prismaClient = getPrismaClient()

	let validators = []
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const podValidators: any[] = []
	const podAddresses = await prismaClient.pod.findMany({
		select: { address: true }
	})
	const podAddressList = podAddresses.map((p) => p.address.toLowerCase())

	const lastValidatorIndex = await prismaClient.validator.findFirst({
		select: { validatorIndex: true },
		orderBy: { validatorIndex: 'desc' }
	})

	const rpcUrl = process.env.NETWORK_CHAIN_RPC_URL
	const status = 'finalized'

	console.time('Done in')
	console.log('Seeding validators for eigenpods:', podAddressList.length)

	let isAtEnd = false
	let batchIndex = 0
	let currentIndex =
		!shouldClearPrev && lastValidatorIndex
			? Number(lastValidatorIndex.validatorIndex) + 1
			: 0
	const chunkSize = 8000
	const batchSize = 120_000
	const clearPrev = shouldClearPrev
		? shouldClearPrev
		: lastValidatorIndex?.validatorIndex
		  ? false
		  : true

	while (!isAtEnd) {
		const validatorRestakeIds = Array.from(
			{ length: batchSize },
			(_, i) => currentIndex + i
		)
		const chunks = chunkArray(validatorRestakeIds, chunkSize)

		console.log(
			`[Batch] Validator chunk ${batchIndex} from ${currentIndex} - ${
				currentIndex + batchSize
			}`
		)

		await Promise.allSettled(
			chunks.map(async (chunk, i) => {
				const req = await fetch(
					`${rpcUrl}/eth/v1/beacon/states/${status}/validators?id=${chunk.join(
						','
					)}`
				)

				const validatorsData = await req.json()
				validators = validators.concat(validatorsData.data)

				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				validatorsData.data.map((v: any) => {
					const withdrawalCredentials = `0x${v.validator.withdrawal_credentials
						.slice(-40)
						.toLowerCase()}`

					if (podAddressList.indexOf(withdrawalCredentials) !== -1) {
						podValidators.push({
							validatorIndex: v.index as bigint,
							status: v.status as string,

							balance: v.balance as bigint,
							effectiveBalance: v.validator.effective_balance as bigint,
							slashed: v.validator.slashed as boolean,
							withdrawalCredentials: v.validator
								.withdrawal_credentials as string,
							activationEpoch: v.validator.activation_epoch as bigint
						})
					}
				})

				if (validatorsData.data.length < chunkSize) {
					isAtEnd = true
				}
			})
		)

		currentIndex += batchSize
		batchIndex++
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const dbTransactions: any[] = []

	// Clear all validator data
	if (clearPrev) {
		dbTransactions.push(prismaClient.validator.deleteMany())
	}

	dbTransactions.push(
		prismaClient.validator.createMany({
			data: podValidators
		})
	)

	await bulkUpdateDbTransactions(
		dbTransactions,
		`[Data] Validator updated size: ${podValidators.length}`
	)

	console.log('Seeded Validators', podValidators.length)
	console.timeEnd('Done in')
}
