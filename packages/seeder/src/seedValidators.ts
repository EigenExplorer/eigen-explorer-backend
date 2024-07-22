import 'dotenv/config'

import type prisma from '@prisma/client'
import { getPrismaClient } from './utils/prismaClient'
import { bulkUpdateDbTransactions } from './utils/seeder'

export async function seedValidators() {
	const prismaClient = getPrismaClient()

	const startAt = await getLastUpdate()
	const endAt = new Date()

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
		const maxPodsPerPage = 10000
		const totalPods = await prismaClient.pod.count()
		const totalPodsPages = Math.ceil(totalPods / maxPodsPerPage)

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const dbTransactions: any[] = []
		let validatorList: prisma.Validator[] = []

		for (let i = 0; i < totalPodsPages; i++) {
			const podAddresses = await prismaClient.pod.findMany({
				select: { address: true },
				take: maxPodsPerPage,
				skip: i * maxPodsPerPage
			})

			const podAddressList = podAddresses.map((p) => p.address.toLowerCase())
			const validators = await fetchValidators(podAddressList, startAt)
			validatorList = validatorList.concat(validators)

			console.log(
				`[Batch] Validators loaded count: ${validators.length} from: ${
					i * maxPodsPerPage
				} to ${Math.min(totalPods, (i + 1) * maxPodsPerPage)}`
			)
		}

		if (validatorList.length > 0) {
			if (!startAt) {
				dbTransactions.push(prismaClient.validator.deleteMany())
				dbTransactions.push(
					prismaClient.validator.createMany({
						data: validatorList
					})
				)
			} else {
				const validatorIndexs = validatorList.map((v) => v.validatorIndex)				
				dbTransactions.push(
					prismaClient.validator.deleteMany({
						where: { validatorIndex: { in: validatorIndexs } }
					})
				)

				dbTransactions.push(
					prismaClient.validator.createMany({
						data: validatorList
					})
				)
			}

			await bulkUpdateDbTransactions(
				dbTransactions,
				`[Data] Validators updated: ${validatorList.length}`
			)
		} else {
			console.log(
				`[In Sync] [Data] Validators from: ${startAt?.getTime()} to: ${endAt.getTime()}`
			)
		}
	} catch (error) {
		console.log('Error seeding Validators: ', error)
	}
}

async function fetchValidators(podAddressList: string[], startAt: Date | null) {
	const url = process.env.VALIDATOR_SERVER_URL
	const token = process.env.VALIDATOR_BEARER_TOKEN

	const requestBody = {
		podAddresses: podAddressList,
		startAt: startAt ? startAt.toISOString() : undefined
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

	return validatorsData
}

async function getLastUpdate() {
	const prismaClient = getPrismaClient()

	const latestRecord = await prismaClient.validator.findFirst({
		select: { updatedAt: true },
		orderBy: { updatedAt: 'desc' }
	})

	return latestRecord ? latestRecord.updatedAt : null
}
