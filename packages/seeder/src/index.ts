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
import { seedAvsStrategyRewards } from './seedAvsStrategyRewards'
import { seedStakerRewardSnapshots } from './seedStakerRewardSnapshots'
import { seedLogsAVSRewardsSubmission } from './events/seedLogsRewardsSubmissions'
import { monitorAvsApy } from './monitors/avsApy'
import { monitorOperatorApy } from './monitors/operatorApy'
import { seedLogStrategyWhitelist } from './events/seedLogStrategyWhitelist'
import { seedLogsDistributionRootSubmitted } from './events/seedLogsDistributionRootSubmitted'
import { seedMetricsStakerRewards } from './metrics/seedMetricsStakerRewards'
import { monitorAvsMetadata } from './monitors/avsMetadata'
import { monitorOperatorMetadata } from './monitors/operatorMetadata'

console.log('Initializing Seeder ...')

// Constants
const MAX_RETRIES = 3
const RETRY_DELAY = 15 * 60
const UPDATE_FREQUENCY = getNetwork().testnet ? 720 : 240
const METADATA_SYNC_FREQUENCY = 7
let seedCount = 0

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
			console.log(`\nSeeding data, every ${UPDATE_FREQUENCY} seconds, till block ${targetBlock}:`)
			console.time('Seeded data in')

			// Seed block data with a global lock to prevent block-less updates
			isSeedingBlockData = true
			await seedBlockData(targetBlock)
			isSeedingBlockData = false

			await Promise.all([
				seedLogsAVSMetadata(targetBlock),
				seedLogsOperatorMetadata(targetBlock),
				seedLogsOperatorAVSRegistrationStatus(targetBlock),
				seedLogsOperatorShares(targetBlock),
				seedLogsStakerDelegation(targetBlock),
				seedLogsPodDeployed(targetBlock),
				seedLogsWithdrawalQueued(targetBlock),
				seedLogsWithdrawalCompleted(targetBlock),
				seedLogsDeposit(targetBlock),
				seedLogsPodSharesUpdated(targetBlock),
				seedLogsAVSRewardsSubmission(targetBlock),
				seedLogStrategyWhitelist(targetBlock),
				seedLogsDistributionRootSubmitted(targetBlock)
			])

			await Promise.all([
				// Avs, Operators and Avs Operators
				(async () => {
					await seedAvs()
					await seedOperators()
					await seedAvsOperators()
					await seedStakers()
					await seedOperatorShares()
				})(),
				// Deposits
				seedDeposits(),
				// Withdrawals
				(async () => {
					await seedQueuedWithdrawals()
					await seedCompletedWithdrawals()
				})(),
				// Pods and Validators
				(async () => {
					await seedPods()
					await seedValidators()
				})()
			])

			await Promise.all([
				// Rewards
				seedAvsStrategyRewards(),
				seedStakerRewardSnapshots(),

				// Metrics
				monitorAvsMetrics(),
				monitorOperatorMetrics()
			])

			// Seed metadata every METADATA_SYNC_FREQUENCY iterations
			if (++seedCount % METADATA_SYNC_FREQUENCY === 0) {
				console.log(`Seeding metadata ...`)
				console.time('Seeded metadata in')
				await seedMetadata()
				console.timeEnd('Seeded metadata in')
			}

			console.timeEnd('Seeded data in')
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

		console.time('Seeded daily data in')

		await seedStrategies()
		await seedEthPricesDaily()
		await seedRestakedStrategies()

		await seedMetricsDeposit()
		await seedMetricsWithdrawal()
		await seedMetricsRestaking()
		await seedMetricsEigenPods()
		await seedMetricsTvl()
		await seedMetricsStakerRewards()

		console.timeEnd('Seeded daily data in')
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

/**
 * Seed APY data
 *
 * @param retryCount
 * @returns
 */
async function seedApyData(retryCount = 0) {
	try {
		console.log('\nSeeding APY data ...')
		console.time('Seeded APY data in')

		if (isSeedingBlockData) {
			console.log('Block data is being seeded. Retrying in 15 minutes...')
			setTimeout(() => seedEigenDailyData(retryCount), RETRY_DELAY * 1000)
			return
		}

		await monitorAvsApy()
		await monitorOperatorApy()

		console.timeEnd('Seeded APY data in')
	} catch (error) {
		console.log(`Failed to seed Avs and Operator APY data at: ${Date.now()}`)
		console.log(error)

		if (retryCount < MAX_RETRIES) {
			console.log(`Retrying in 15 minutes... (Attempt ${retryCount + 1} of ${MAX_RETRIES})`)
			setTimeout(() => seedEigenDailyData(retryCount + 1), RETRY_DELAY * 1000)
		} else {
			console.log('Max retries reached. Avs and Operator APY seeding failed.')
		}
	}
}

/**
 * Seed metadata
 *
 * @returns
 */
async function seedMetadata() {
	try {
		console.log('\nSeeding AVS metadata ...')
		await monitorAvsMetadata()
	} catch (error) {
		console.error('Failed to seed AVS metadata', error)
	}

	try {
		console.log('\nSeeding Operator metadata ...')
		await monitorOperatorMetadata()
	} catch (error) {
		console.error('Failed to seed Operator metadata', error)
	}
}

// Start seeding data instantly
seedEigenData()

// Schedule seedEigenDailyData to run at 5 minutes past midnight every day
cron.schedule('5 0 * * *', () => seedEigenDailyData())

// Schedule seedApyData to run at 5 minutes past 2am every day
cron.schedule('5 2 * * *', () => seedApyData())
