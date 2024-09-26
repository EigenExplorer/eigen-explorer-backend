import 'dotenv/config'

import { getViemClient } from './utils/viemClient'
import { seedLogsAVSMetadata } from './events/seedLogsAVSMetadata'
import { seedLogsOperatorMetadata } from './events/seedLogsOperatorMetadata'
import { seedLogsOperatorAVSRegistrationStatus } from './events/seedLogsOperatorAVSRegistrationStatus'
import { seedLogsOperatorShares } from './events/seedLogsOperatorShares'
import { seedLogsStakerDelegation } from './events/seedLogsStakerDelegation'
import { seedLogsPodDeployed } from './events/seedLogsPodDeployed'
import { seedLogsWithdrawalQueued } from './events/seedLogsWithdrawalQueued'
import { seedLogsWithdrawalCompleted } from './events/seedLogsWithdrawalCompleted'
import { seedLogsDeposit } from './events/seedLogsDeposit'
import { seedLogsPodSharesUpdated } from './events/seedLogsPodSharesUpdated'
import { seedLogsRewardsSubmissions } from './events/seedLogsRewardsSubmissions'
import { seedAvs } from './seedAvs'
import { seedAvsOperators } from './seedAvsOperators'
import { seedOperators } from './seedOperators'
import { seedPods } from './seedPods'
import { seedStakers } from './seedStakers'
import { seedBlockData } from './blocks/seedBlockData'
import { seedOperatorShares } from './seedOperatorShares'
import { seedValidators } from './seedValidators'
import { seedQueuedWithdrawals } from './seedWithdrawalsQueued'
import { seedCompletedWithdrawals } from './seedWithdrawalsCompleted'
import { seedDeposits } from './seedDeposits'
import { seedStrategies } from './seedStrategies'
import { seedRewardsSubmissions } from './seedRewardsSubmissions'
import { seedRestakedStrategies } from './seedAvsRestakedStrategies'
import { seedEthPricesDaily } from './seedEthPricesDaily'
import { seedMetricsDepositHourly } from './metrics/seedMetricsDeposit'
import { seedMetricsWithdrawalHourly } from './metrics/seedMetricsWithdrawal'
import { seedMetricsRestakingHourly } from './metrics/seedMetricsRestaking'
import { seedMetricsEigenPodsHourly } from './metrics/seedMetricsEigenPods'
import { seedMetricsTvlHourly } from './metrics/seedMetricsTvl'
import { monitorAvsMetadata } from './monitors/avsMetadata'
import { monitorOperatorMetadata } from './monitors/operatorMetadata'
import { monitorAvsMetrics } from './monitors/avsMetrics'
import { monitorOperatorMetrics } from './monitors/operatorMetrics'

console.log('Initializing Seeder ...')

const UPDATE_DELAY = 120

const UPDATE_FREQUENCY_INSTANT = 120
const UPDATE_FREQUENCY_SLOW = 240
const UPDATE_FREQUENCY_HOURLY = 3600
const UPDATE_FREQUENCY_QUARTERLY = UPDATE_FREQUENCY_HOURLY * 4
const UPDATE_FREQUENCY_DAILY = UPDATE_FREQUENCY_HOURLY * 24

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
			await seedLogsPodSharesUpdated(targetBlock)
			await seedLogsRewardsSubmissions(targetBlock)

			await seedAvs()
			await seedOperators()
			await seedAvsOperators()
			await seedStakers()
			await seedOperatorShares()
			await seedQueuedWithdrawals()
			await seedCompletedWithdrawals()
			await seedDeposits()
			await seedPods()
			await seedValidators()
			await seedRewardsSubmissions()
		} catch (error) {
			console.log('Failed to seed data at:', Date.now())
			console.log(error)
		}

		await delay(UPDATE_FREQUENCY_INSTANT)
	}
}

async function seedMetadata() {
	await delay(UPDATE_DELAY)

	while (true) {
		try {
			console.log('\nMonitoring metadata...')

			await monitorAvsMetadata()
			await monitorOperatorMetadata()
			await monitorAvsMetrics()
			await monitorOperatorMetrics()
		} catch (error) {
			console.log('Failed to monitor metadata at:', Date.now())
			console.log(error)
		}

		await delay(UPDATE_FREQUENCY_SLOW)
	}
}

async function seedEigenStrategiesData() {
	await delay(UPDATE_DELAY * 2)

	while (true) {
		try {
			console.log('\nSeeding strategies data ...')

			await seedStrategies()
			await seedEthPricesDaily()
		} catch (error) {
			console.log('Failed to seed strategies at:', Date.now())
			console.log(error)
		}

		await delay(UPDATE_FREQUENCY_DAILY)
	}
}

async function seedRestakedData() {
	await delay(UPDATE_DELAY * 3)

	while (true) {
		try {
			console.log('\nSeeding restaked data ...')

			await seedRestakedStrategies()
		} catch (error) {
			console.log('Failed to seed restaked data at:', Date.now())
			console.log(error)
		}

		await delay(UPDATE_FREQUENCY_QUARTERLY)
	}
}

async function seedMetricsData() {
	await delay(UPDATE_DELAY * 4)

	while (true) {
		try {
			console.log('\nSeeding metrics data ...')

			await seedMetricsDepositHourly()
			await seedMetricsWithdrawalHourly()
			await seedMetricsRestakingHourly()
			await seedMetricsEigenPodsHourly()
			await seedMetricsTvlHourly()
		} catch (error) {
			console.log('Failed to seed metrics data at:', Date.now())
			console.log(error)
		}

		await delay(UPDATE_FREQUENCY_HOURLY)
	}
}

seedEigenData()
seedMetadata()
seedEigenStrategiesData()
seedRestakedData()
seedMetricsData()
