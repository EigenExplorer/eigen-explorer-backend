import { getPrismaClient } from '../prisma/prismaClient'

export async function seedValidators(fromBlock: bigint, toBlock?: bigint) {
	const prismaClient = getPrismaClient()

	// Clear all validator data
	await prismaClient.validator.deleteMany()

	let validators = []
	const validatorRestake = await prismaClient.validatorRestake.findMany()
	const validatorRestakeIds = validatorRestake.map((vr) => vr.validatorIndex)

	const rpcUrl = process.env.NETWORK_CHAIN_RPC_URL
	const status = 'head'

	console.log('Seed validators')

	const totalCount = validatorRestakeIds.length
	let currentIndex = 0
	let nextIndex = 0

	while (nextIndex < totalCount) {
		nextIndex = currentIndex + 5000
		if (nextIndex >= totalCount) nextIndex = totalCount

		const req = await fetch(
			`${rpcUrl}/eth/v1/beacon/states/${status}/validators?id=${validatorRestakeIds
				.slice(currentIndex, nextIndex)
				.join(',')}`
		)

		const validatorsData = await req.json()

		console.log(
			'batch',
			currentIndex + 1,
			nextIndex,
			validatorsData.data.length
		)
		validators = validators.concat(validatorsData.data)

		currentIndex = nextIndex
	}

	await prismaClient.validator.createMany({
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		data: validators.map((v: any) => ({
			validatorIndex: v.index as bigint,
			status: v.status as string,

			balance: v.balance as bigint,
			effectiveBalance: v.validator.effective_balance as bigint,
			slashed: v.validator.slashed as boolean,
			withdrawalCredentials: v.validator.withdrawal_credentials as string
		}))
	})

	console.log('Seeded Validators', validators.length)
}
