import 'dotenv/config'

import type prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'

const url = process.env.VALIDATOR_SERVER_URL

export async function seedValidators() {
	const prismaClient = getPrismaClient()

	const token = process.env.VALIDATOR_BEARER_TOKEN
	const startAt = await getLastUpdate()
	const endAt = new Date()

	console.time('Done in')

	// Bail early if there is no time diff to sync
	if (startAt) {
		if (endAt.getTime() - startAt.getTime() <= 0) {
			console.log(
				`[In Sync] [Data] Validators from: ${startAt.getTime()} to: ${endAt.getTime()}`
			)
			return
		}
	}

	try {
		// Get all pod addresses and add it to the request
		const podAddresses = await prismaClient.pod.findMany({
			select: { address: true }
		})
		const podAddressList = podAddresses.map((p) => p.address.toLowerCase())

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []
		const validatorList: prisma.Validator[] = []

		const requestBody = {
			podAddresses: podAddressList,
			...(startAt && { startAt: startAt.toISOString() })
		}

		const response = await fetch(`${url}/validators`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept-Encoding': 'gzip'
			},
			body: JSON.stringify(requestBody)
		})
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`)
		}
		if (!response.body) {
			throw new Error('Empty response')
		}

		const reader = response.body.getReader()
		const decoder = new TextDecoder()

		const chunks: Uint8Array[] = []
		let totalSize = 0

		while (true) {
			const { done, value } = await reader.read()

			if (done) {
				break
			}

			chunks.push(value)
			totalSize += value.length
		}

		const fullBuffer = new Uint8Array(totalSize)
		let offset = 0

		for (const chunk of chunks) {
			fullBuffer.set(chunk, offset)
			offset += chunk.length
		}

		const jsonString = decoder.decode(fullBuffer)
		const validatorsData = JSON.parse(jsonString)
		const totalValidators = validatorsData.length

		if (totalValidators > 0) {
			if (!startAt) {
				for (const validatorData of validatorsData) {
					validatorList.push(validatorData)
				}
				dbTransactions.push(
					prismaClient.validator.createMany({
						data: validatorList
					})
				)
			} else {
				for (const validatorData of validatorsData) {
					dbTransactions.push(
						prismaClient.validator.upsert({
							where: {
								validatorIndex: BigInt(validatorData.validatorIndex)
							},
							create: {
								validatorIndex: BigInt(validatorData.validatorIndex),
								pubkey: String(validatorData.pubkey).toLowerCase(),
								status: String(validatorData.status),
								balance: BigInt(validatorData.balance),
								effectiveBalance: BigInt(validatorData.effectiveBalance),
								slashed: Boolean(validatorData.slashed),
								withdrawalCredentials: String(
									validatorData.withdrawalCredentials
								).toLowerCase(),
								activationEpoch: validatorData.activationEpoch,
								exitEpoch: validatorData.exitEpoch,
								updatedAt: validatorData.updatedAt
							},
							update: {
								status: String(validatorData.status),
								balance: BigInt(validatorData.balance),
								effectiveBalance: BigInt(validatorData.effectiveBalance),
								slashed: Boolean(validatorData.slashed),
								exitEpoch: validatorData.exitEpoch,
								updatedAt: validatorData.updatedAt
							}
						})
					)
				}
			}
		}

		await bulkUpdateDbTransactions(
			dbTransactions,
			`[Data] Validators updated: ${totalValidators}`
		)
	} catch (error) {
		console.log('Error seeding Validators: ', error)
	}
	console.timeEnd('Done in')
}

async function getLastUpdate() {
	const prismaClient = getPrismaClient()

	const latestRecord = await prismaClient.validator.findFirst({
		select: { updatedAt: true },
		orderBy: { updatedAt: 'desc' }
	})

	return latestRecord ? latestRecord.updatedAt : null
}
