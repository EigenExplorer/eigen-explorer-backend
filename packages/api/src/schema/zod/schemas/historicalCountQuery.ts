import z from '..'

export const HistoricalCountSchema = z
	.object({
		frequency: z
			.enum(['1h', '1d', '7d'])
			.default('1h')
			.describe('Frequency of data points'),
		variant: z
			.enum(['count', 'cumulative'])
			.default('cumulative')
			.describe('Type of tally, count or cumulative'),
		startAt: z
			.string()
			.optional()
			.describe('Start date in ISO string format')
			.refine((val) => !val || !Number.isNaN(Date.parse(val)), {
				message: 'Invalid date format'
			})
			.default(() => new Date(Date.now() - 86400000).toISOString()) // Default to 1 day ago
			.describe('Start date in ISO string format'),
		endAt: z
			.string()
			.optional()
			.describe('End date in ISO string format')
			.refine((val) => !val || !Number.isNaN(Date.parse(val)), {
				message: 'Invalid date format'
			})
			.default(() => new Date().toISOString()) // Default to now
			.describe('End date in ISO string format')
	})
	.refine(
		(data) => {
			const { frequency, startAt, endAt } = data
			const start = new Date(startAt)
			const end = new Date(endAt)
			const durationMs = end.getTime() - start.getTime()

			if (frequency === '1h' && durationMs > 48 * 60 * 60 * 1000) {
				return false
			}
			if (frequency === '1d' && durationMs > 31 * 24 * 60 * 60 * 1000) {
				return false
			}
			if (frequency === '7d' && durationMs > 365 * 24 * 60 * 60 * 1000) {
				return false
			}
			return true
		},
		{
			message:
				'Duration between startAt and endAt exceeds the allowed maximum for the selected frequency',
			path: ['startAt', 'endAt']
		}
	)

export default HistoricalCountSchema
