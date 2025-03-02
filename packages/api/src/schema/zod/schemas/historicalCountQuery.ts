import z from '..'

const dayInMs = 24 * 60 * 60 * 1000
const gracePeriod = 10 * 60 * 1000 // 10 mins
const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/
const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/

/**
 * Range limits and default ranges basis requested frequency
 *
 */
const frequencyConfig = {
	'1d': { allowance: 365 * dayInMs + gracePeriod, defaultRange: 31 * dayInMs },
	'7d': { allowance: 720 * dayInMs + gracePeriod, defaultRange: 365 * dayInMs }
}

/**
 * Validates that the given time range doesn't exceed the range limits for the given frequency
 *
 * @param startAt
 * @param endAt
 * @param frequency
 * @returns
 */
const validateDateRange = (
	startAt: string,
	endAt: string,
	frequency: keyof typeof frequencyConfig
) => {
	const start = new Date(startAt)
	const end = new Date(endAt)
	const durationMs = end.getTime() - start.getTime()
	return durationMs <= frequencyConfig[frequency].allowance
}

/**
 * In case startAt and/or endAt not specified by user, applies default ranges basis frequency
 *
 * @param frequency
 * @param startAt
 * @param endAt
 * @returns
 */
const getDefaultDates = (
	frequency: keyof typeof frequencyConfig,
	startAt?: string,
	endAt?: string
) => {
	const now = new Date()
	const { defaultRange, allowance } = frequencyConfig[frequency]

	if (!startAt && !endAt) {
		// Implement range defaults
		return {
			startAt: new Date(now.getTime() - defaultRange).toISOString(),
			endAt: now.toISOString()
		}
	}

	if (startAt && !endAt) {
		// Implement range defaults and cap endAt to current time
		const start = new Date(startAt)
		return {
			startAt,
			endAt: new Date(Math.min(start.getTime() + allowance, now.getTime())).toISOString()
		}
	}

	if (!startAt && endAt) {
		// Implement range defaults
		const end = new Date(endAt)
		return {
			startAt: new Date(end.getTime() - defaultRange).toISOString(),
			endAt
		}
	}

	return { startAt, endAt }
}

/**
 * Schema definition with limits applied for startAt and endAt range basis frequency
 *
 */
export const HistoricalCountSchema = z
	.object({
		frequency: z.enum(['1d', '7d']).default('1d').describe('Frequency of data points'),
		variant: z
			.enum(['discrete', 'cumulative'])
			.default('cumulative')
			.describe('Type of tally, discrete or cumulative')
			.openapi({ example: 'cumulative' }),
		startAt: z
			.string()
			.optional()
			.refine(
				(val) =>
					!val ||
					((isoRegex.test(val) || yyyymmddRegex.test(val)) &&
						!Number.isNaN(new Date(val).getTime())),
				{
					message: 'Invalid date format for startAt. Use YYYY-MM-DD or ISO 8601 format.'
				}
			)
			.default('')
			.describe('Start date in ISO string format')
			.openapi({ example: '2024-04-11T08:31:11.000' }),
		endAt: z
			.string()
			.optional()
			.refine(
				(val) =>
					!val ||
					((isoRegex.test(val) || yyyymmddRegex.test(val)) &&
						!Number.isNaN(new Date(val).getTime())),
				{
					message: 'Invalid date format for endAt. Use YYYY-MM-DD or ISO 8601 format.'
				}
			)
			.default('')
			.describe('End date in ISO string format')
			.openapi({ example: '2024-04-12T08:31:11.000' })
	})
	.refine(
		(data) => {
			if (data.startAt && data.endAt) {
				return new Date(data.endAt).getTime() >= new Date(data.startAt).getTime()
			}
			return true
		},
		{
			message: 'endAt must be after startAt',
			path: ['endAt']
		}
	)
	.refine(
		(data) => {
			try {
				const { frequency, startAt, endAt } = data
				const dates = getDefaultDates(frequency, startAt, endAt)
				Object.assign(data, dates)

				return validateDateRange(data.startAt, data.endAt, frequency)
			} catch {
				return false
			}
		},
		{
			message:
				'Duration between startAt and endAt exceeds the range allowance for selected frequency',
			path: ['startAt', 'endAt']
		}
	)

export default HistoricalCountSchema
