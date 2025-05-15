import 'dotenv/config'
import cron from 'node-cron'

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
import { seedLogsSlashingWithdrawalCompleted } from './events/seedLogsSlashingWithdrawalCompleted'
import { seedLogsSlashingWithdrawalQueued } from './events/seedLogsSlashingWithdrawalQueued'
import { seedCompletedSlashingWithdrawals } from './seedSlashingWithdrawalsCompleted'
import { seedQueuedSlashingWithdrawals } from './seedSlashingWithdrawalsQueued'
import { seedLogsAVSRegistrarSet } from './events/seedLogsAVSRegistrarSet'
import { seedLogsAllocationDelaySet } from './events/seedLogsAllocationDelaySet'
import { seedLogsAllocationUpdated } from './events/seedLogsAllocationUpdated'
import { seedLogsOperatorSetCreated } from './events/seedLogsOperatorSetCreated'
import { seedLogsOperatorSlashed } from './events/seedLogsOperatorSlashed'
import { seedLogsOperatorMagnitudeUpdated } from './events/seedLogsOperatorMagnitudeUpdated'
import { monitorAvsMetadata } from './monitors/avsMetadata'
import { monitorOperatorMetadata } from './monitors/operatorMetadata'
import { seedLogsBeaconChainSlashingFactor } from './events/seedLogsBeaconChainSlashingFactorDecreased'
import { seedBeaconChainSlashingFactor } from './seedBeaconChainSlashingFactor'
import { seedLogsAVSOperatorSetOperators } from './events/seedLogsAVSOperatorSetOperators'
import { seedLogsOperatorSetStrategies } from './events/seedLogsOperatorSetStrategies'
import { seedAllocationDelay } from './seedAllocationDelay'
import { seedAvsAllocation } from './seedAvsAllocation'
import { seedAvsOperatorSets } from './seedAvsOperatorSets'
import { seedAvsRegistrar } from './seedAvsRegistrar'
import { seedOperatorSet } from './seedOperatorSet'
import { seedOperatorSetStrategies } from './seedOperatorSetStrategies'
import { seedOperatorSlashed } from './seedOperatorSlashed'
import { seedOperatorMagnitude } from './seedOperatorMagnitude'
import { seedLogsDepositScalingFactor } from './events/seedLogsDepositScalingFactor'
import { seedLogsOperatorSharesSlashed } from './events/seedLogsOperatorSharesSlashed'

console.log('Initializing Seeder ...')

// Constants
const MAX_RETRIES = 3
const RETRY_DELAY = 15 * 60

// Locks
let isSeedingBlockData = false
let isSeedingLogs = false

// Complete a full data seed and schedule future seeding events
seedEigenDataFull().then(() => {
	// Start seeding data instantly
	cron.schedule('*/1 * * * *', () => seedEigenLogs())

	// Start seeding metadata every 30 minutes (at minute 0 and 30)
	cron.schedule('0,30 * * * *', () => seedMetadata())

	// Run metrics seeding at 15 minutes past every hour
	cron.schedule('15 * * * *', () => seedMetrics())

	// Schedule seedEigenDailyData to run at 5 minutes past midnight every day
	cron.schedule('5 0 * * *', () => seedEigenDailyData())

	// Schedule seedApyData to run at 5 minutes past 2am every day
	cron.schedule('5 2 * * *', () => seedApyData())
})

/**
 * Seed logs
 */
async function seedEigenLogs() {
	try {
		if (isSeedingLogs) {
			console.log('Logs are being seeded. Retrying in 1 minutes...')
			return
		}

		isSeedingLogs = true

		const viemClient = getViemClient()
		const targetBlock = await viemClient.getBlockNumber()
		console.log(`\nSeeding logs, every 60 seconds, till block ${targetBlock}:`)
		console.time('Seeded logs in')

		await doSeedBlockData(targetBlock)
		const results = await doSeedLogs(targetBlock)
		const updateEvents: Promise<void>[] = []

		// Schedule additional seeding based on log changes
		if (results.some((changed) => changed)) {
			// Schedule specific seed functions based on which logs changed
			if (
				results[0].updatedCount > 0 ||
				results[1].updatedCount > 0 ||
				results[2].updatedCount > 0 ||
				results[3].updatedCount > 0 ||
				results[4].updatedCount > 0
			) {
				updateEvents.push(
					(async () => {
						await seedAvs()
						await seedOperators()
						await seedAvsOperators()
						await seedOperatorShares()
						await seedStakers()
					})()
				)
			}

			if (results[5].updatedCount > 0) {
				updateEvents.push(
					(async () => {
						await seedPods()
						await seedValidators()
					})()
				)
			}

			if (
				results[6].updatedCount > 0 ||
				results[7].updatedCount > 0 ||
				results[8].updatedCount > 0 ||
				results[9].updatedCount > 0
			) {
				updateEvents.push(
					(async () => {
						await seedQueuedWithdrawals()
						await seedCompletedWithdrawals()
						await seedDeposits()
					})()
				)
			}

			if (results[10].updatedCount > 0) {
				updateEvents.push(
					(async () => {
						await seedAvsStrategyRewards()
						await seedStakerRewardSnapshots()
					})()
				)
			}

			if (results[11].updatedCount > 0) {
				updateEvents.push(seedStrategies())
			}

			await Promise.all(updateEvents)

			if (
				results[3].updatedCount > 0 &&
				results[3].entityType === 'operator' &&
				results[3].entities &&
				results[3].entities.length > 0
			) {
				await monitorAvsMetrics({ filterOperators: results[3].entities })
				await monitorOperatorMetrics({ filterOperators: results[3].entities })
			}
		}

		console.timeEnd('Seeded logs in')
		isSeedingLogs = false
	} catch (error) {
		console.log('Failed to seed logs at:', Date.now())
		console.log(error)
		isSeedingLogs = false
	}
}

/**
 * Seed data
 *
 * @returns
 */
async function seedEigenDataFull() {
	try {
		const viemClient = getViemClient()
		const targetBlock = await viemClient.getBlockNumber()
		console.log(`\nSeeding data till block ${targetBlock}:`)
		console.time('Seeded data in')

		await doSeedBlockData(targetBlock)
		await doSeedLogs(targetBlock)

		await Promise.all([
			seedLogsAVSMetadata(targetBlock),
			seedLogsOperatorMetadata(targetBlock),
			seedLogsOperatorAVSRegistrationStatus(targetBlock),
			seedLogsOperatorShares(targetBlock),
			seedLogsStakerDelegation(targetBlock),
			seedLogsPodDeployed(targetBlock),
			seedLogsWithdrawalQueued(targetBlock),
			seedLogsWithdrawalCompleted(targetBlock),
			seedLogsSlashingWithdrawalQueued(targetBlock),
			seedLogsSlashingWithdrawalCompleted(targetBlock),
			seedLogsDeposit(targetBlock),
			seedLogsPodSharesUpdated(targetBlock),
			seedLogsAVSRewardsSubmission(targetBlock),
			seedLogStrategyWhitelist(targetBlock),
			seedLogsDistributionRootSubmitted(targetBlock),
			seedLogsAllocationDelaySet(targetBlock),
			seedLogsAllocationUpdated(targetBlock),
			seedLogsAVSRegistrarSet(targetBlock),
			seedLogsOperatorMagnitudeUpdated(targetBlock),
			seedLogsAVSOperatorSetOperators(targetBlock),
			seedLogsOperatorSetCreated(targetBlock),
			seedLogsOperatorSlashed(targetBlock),
			seedLogsOperatorSetStrategies(targetBlock),
			seedLogsBeaconChainSlashingFactor(targetBlock),
			seedLogsDepositScalingFactor(targetBlock),
			seedLogsOperatorSharesSlashed(targetBlock)
		])

		await Promise.all([
			// Avs, Operators, Avs Operators, OperatorSets, AvsOperatorSets and Slashing
			(async () => {
				await seedAvs()
				await seedOperators()
				await seedAvsOperators()
				await seedStakers()
				await seedOperatorShares()

				await seedOperatorSet()
				await seedOperatorSetStrategies()
				await seedAllocationDelay()
				await seedAvsRegistrar()

				await seedAvsOperatorSets()
				await seedAvsAllocation()
				await seedOperatorMagnitude()
				await seedOperatorSlashed()
			})(),
			// Deposits
			seedDeposits(),
			// Withdrawals
			(async () => {
				await seedQueuedWithdrawals()
				await seedCompletedWithdrawals()
				await seedQueuedSlashingWithdrawals()
				await seedCompletedSlashingWithdrawals()
			})(),
			// Pods and Validators
			(async () => {
				await seedPods()
				await seedValidators()
				await seedBeaconChainSlashingFactor()
			})()
		])

		await Promise.all([
			// Rewards
			seedAvsStrategyRewards(),
			seedStakerRewardSnapshots(),

			// Metrics
			monitorAvsMetrics({}),
			monitorOperatorMetrics({})
		])

		console.timeEnd('Seeded data in')
	} catch (error) {
		console.log('Failed to seed data at:', Date.now())
		console.log(error)
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

		await seedRestakedStrategies()
		await seedEthPricesDaily()

		if (!process.env.FLAG_SEEDER_DISABLE_HISTORICAL_DATA) {
			await seedMetricsDeposit()
			await seedMetricsWithdrawal()
			await seedMetricsRestaking('full')
			await seedMetricsEigenPods()
			await seedMetricsTvl()
			await seedMetricsStakerRewards()
		}

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

/**
 * Seed full metrics hourly
 */
async function seedMetrics() {
	try {
		console.log('\nSeeding metrics ...')
		await monitorAvsMetrics({})
		await monitorOperatorMetrics({})
	} catch (error) {
		console.error('Failed to seed metrics', error)
	}
}

/**
 * Seed block data
 *
 * @param targetBlock
 */
async function doSeedBlockData(targetBlock: bigint) {
	try {
		// Seed block data with a global lock to prevent block-less updates
		isSeedingBlockData = true
		await seedBlockData(targetBlock)
		isSeedingBlockData = false
	} catch (error) {
		console.log('Failed to seed block data at:', Date.now())
		console.log(error)

		isSeedingBlockData = false
	}
}

async function doSeedLogs(targetBlock: bigint) {
	return await Promise.all([
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
}
