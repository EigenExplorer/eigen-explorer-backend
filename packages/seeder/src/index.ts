import 'dotenv/config'
import cron from 'node-cron'

import { seedAvs } from './seedAvs'
import { seedAvsOperators } from './seedAvsOperators'
import { seedOperators } from './seedOperators'
import { seedPods } from './seedPods'
import { seedStakers } from './seedStakers'
import { getNetwork, getViemClient } from './utils/viemClient'
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
import { seedLogsPodSharesUpdated } from './events/seedLogsPodSharesUpdated'
import { monitorAvsMetadata } from './monitors/avsMetadata'
import { monitorOperatorMetadata } from './monitors/operatorMetadata'
import { seedMetricsDeposit } from './metrics/seedMetricsDeposit'
import { seedMetricsWithdrawal } from './metrics/seedMetricsWithdrawal'
import { seedMetricsRestaking } from './metrics/seedMetricsRestaking'
import { seedStrategies } from './seedStrategies'
import { seedRestakedStrategies } from './seedAvsRestakedStrategies'
import { seedEthPricesDaily } from './seedEthPricesDaily'
import { seedMetricsEigenPods } from './metrics/seedMetricsEigenPods'
import { seedMetricsTvl } from './metrics/seedMetricsTvl'
import { monitorAvsMetrics } from './monitors/avsMetrics'
import { monitorOperatorMetrics } from './monitors/operatorMetrics'

console.log('Initializing Seeder ...')

// Constants
const MAX_RETRIES = 3
const RETRY_DELAY = 15 * 60
const UPDATE_FREQUENCY = getNetwork().testnet ? 600 : 240

// Locks
let isSeedingBlockData = false

function delay(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

/**
 * Seed data
 * 
 * @returns
 */
async function seedEigenData() {
	while (true) {
		try {
			const viemClient = getViemClient()
			const targetBlock = await viemClient.getBlockNumber()
			console.log('\nSeeding data ...', targetBlock)

			// Seed block data with a global lock to prevent block-less updates
			isSeedingBlockData = true
			await seedBlockData(targetBlock)
			isSeedingBlockData = false

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

			await monitorAvsMetadata()
			await monitorOperatorMetadata()
			await monitorAvsMetrics()
			await monitorOperatorMetrics()
		} catch (error) {
			console.log('Failed to seed data at:', Date.now())
			console.log(error)

			isSeedingBlockData = false
		}

		await delay(UPDATE_FREQUENCY)
	}
}

/**
 * Seed daily data
 * 
 * @param retryCount 
 * @returns 
 */
async function seedEigenDailyData(retryCount = 0) {
	try {
		console.log('\nSeeding daily data ...')
		
		if (isSeedingBlockData) {
			console.log('Block data is being seeded. Retrying in 15 minutes...')
			setTimeout(() => seedEigenDailyData(retryCount), RETRY_DELAY * 1000)
			return
		}

		await seedStrategies()
		await seedEthPricesDaily()
		await seedRestakedStrategies()

		await seedMetricsDeposit()
		await seedMetricsWithdrawal()
		await seedMetricsRestaking()
		await seedMetricsEigenPods()
		await seedMetricsTvl()

		console.log('Daily data seeding completed successfully.')
	} catch (error) {
		console.log(`Failed to seed daily data at: ${Date.now()}`)
		console.log(error)

		if (retryCount < MAX_RETRIES) {
			console.log(`Retrying in 15 minutes... (Attempt ${retryCount + 1} of ${MAX_RETRIES})`)
			setTimeout(() => seedEigenDailyData(retryCount + 1), RETRY_DELAY * 1000)
		} else {
			console.log('Max retries reached. Daily data seeding failed.')
		}
	}
}

// Start seeding data instantly
seedEigenData()

// Schedule seedEigenDailyData to run at 1 minute past midnight every day
cron.schedule('1 0 * * *', () => seedEigenDailyData())
