import 'dotenv/config'

import { seedAvs } from './seedAvs'
import { seedAvsOperators } from './seedAvsOperators'
import { seedOperators } from './seedOperators'
import { seedPods } from './seedPods'
import { seedStakers } from './seedStakers'
import { getViemClient } from './utils/viemClient'
import { seedBlockData } from './blocks/seedBlockData'
import { seedLogsAVSMetadata } from './events/seedLogsAVSMetadata'
import { seedLogsOperatorMetadata } from './events/seedLogsOperatorMetadata'
import { seedLogsOperatorAVSRegistrationStatus } from './events/seedLogsOperatorAVSRegistrationStatus'
import { seedLogsOperatorShares } from './events/seedLogsOperatorShares'
import { seedLogsStakerDelegation } from './events/seedLogsStakerDelegation'
import { seedLogsPodDeployed } from './events/seedLogsPodDeployed'
import { seedOperatorShares } from './seedOperatorShares'
import { seedValidators } from './seedValidators'
import { seedQueuedWithdrawals } from './seedWithdrawalsQueued'
import { seedCompletedWithdrawals } from './seedWithdrawalsCompleted'
import { seedLogsWithdrawalQueued } from './events/seedLogsWithdrawalQueued'
import { seedLogsWithdrawalCompleted } from './events/seedLogsWithdrawalCompleted'
import { seedLogsDeposit } from './events/seedLogsDeposit'
import { seedDeposits } from './seedDeposits'
import { monitorAvsMetadata } from './monitors/avsMetadata'
import { monitorOperatorMetadata } from './monitors/operatorMetadata'
import { seedStrategies } from './seedStrategies'

console.log('Initializing Seeder ...')

function delay(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

async function seedEigenData() {
	while (true) {
		try {
			const viemClient = getViemClient()
			const targetBlock = await viemClient.getBlockNumber()
			console.log('\nSeeding data ...', targetBlock)

			await seedBlockData(targetBlock)
			await seedLogsAVSMetadata(targetBlock)
			await seedLogsOperatorMetadata(targetBlock)
			await seedLogsOperatorAVSRegistrationStatus(targetBlock)
			await seedLogsOperatorShares(targetBlock)
			await seedLogsStakerDelegation(targetBlock)
			await seedLogsPodDeployed(targetBlock)
			await seedLogsWithdrawalQueued(targetBlock)
			await seedLogsWithdrawalCompleted(targetBlock)
			await seedLogsDeposit(targetBlock)

			await seedAvs()
			await seedOperators()
			await seedAvsOperators()
			await seedStakers()
			await seedOperatorShares()
			await seedQueuedWithdrawals()
			await seedCompletedWithdrawals()
			await seedDeposits()
			await seedPods()
		} catch (error) {
			console.log('Failed to seed data at:', Date.now())
			console.log(error)
		}

		await delay(120)
	}
}

async function seedMetadata() {
	await delay(120)

	while (true) {
		try {
			console.log('\nMonitoring metadata...')

			await monitorAvsMetadata()
			await monitorOperatorMetadata()
		} catch (error) {
			console.log('Failed to monitor metadata at:', Date.now())
		}

		await delay(120)
	}
}

async function seedEigenPodValidators() {
	await delay(120)

	while (true) {
		try {
			console.log('\nSeeding Eigen Pods data ...')

			await seedValidators()
		} catch (error) {
			console.log(error)
			console.log('Failed to seed Validators at:', Date.now())
		}

		await delay(3600)
	}
}

async function seedEigenStrategiesData() {
	await delay(120)

	while (true) {
		try {
			console.log('\nSeeding strategies data ...')

			await seedStrategies()
		} catch (error) {
			console.log(error)
			console.log('Failed to seed strategies at:', Date.now())
		}

		await delay(3600)
	}
}

seedEigenData()
seedMetadata()
seedEigenStrategiesData()
seedEigenPodValidators()
