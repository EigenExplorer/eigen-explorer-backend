import z from '..'

export const HistoricalCountSchema = z
	.object({
		frequency: z
			.enum(['1h', '1d', '7d'])
			.default('1h')
			.describe('Frequency of data points'),
		variant: z
			.enum(['discrete', 'cumulative'])
			.default('cumulative')
			.describe('Type of tally, discrete or cumulative'),
		startAt: z
			.string()
			.optional()
			.describe('Start date in ISO string format')
			.refine((val) => !val || !Number.isNaN(Date.parse(val)), {
				message: 'Invalid date format'
			})
			.default('')
			.describe('Start date in ISO string format'),
		endAt: z
			.string()
			.optional()
			.describe('End date in ISO string format')
			.refine((val) => !val || !Number.isNaN(Date.parse(val)), {
				message: 'Invalid date format'
			})
			.default('')
			.describe('End date in ISO string format'),
		convertShares: z
			.enum(['true', 'false'])
			.optional()
			.default('false')
			.describe('Choose between receiving output values denominated in shares vs Eth')
	})
	.refine(
		(data) => {
			const { startAt, endAt, frequency } = data
			if (!endAt) {
				if (startAt) {
					const startDate = new Date(startAt)

					if (frequency === '1h') {
						const endDate = new Date(startDate.getTime() + 48 * 60 * 60 * 1000)
						data.endAt = endDate.toISOString()
					}
					if (frequency === '1d') {
						const endDate = new Date(
							startDate.getTime() + 31 * 24 * 60 * 60 * 1000
						)
						data.endAt = endDate.toISOString()
					}
					if (frequency === '7d') {
						const endDate = new Date(
							startDate.getTime() + 365 * 24 * 60 * 60 * 1000
						)
						data.endAt = endDate.toISOString()
					}
				} else {
					const endDate = new Date()
					data.endAt = endDate.toISOString()
				}
			}

			if (!startAt) {
				const endDate = new Date(data.endAt)

				if (frequency === '1h') {
					const startDate = new Date(endDate.getTime() - 48 * 60 * 60 * 1000)
					data.startAt = startDate.toISOString()
				}
				if (frequency === '1d') {
					const startDate = new Date(
						endDate.getTime() - 31 * 24 * 60 * 60 * 1000
					)
					data.startAt = startDate.toISOString()
				}
				if (frequency === '7d') {
					const startDate = new Date(
						endDate.getTime() - 365 * 24 * 60 * 60 * 1000
					)
					data.startAt = startDate.toISOString()
				}
			}

			const start = new Date(data.startAt)
			const end = new Date(data.endAt)
			return end.getTime() >= start.getTime()
		},
		{
			message: 'endAt must be after startAt',
			path: ['endAt']
		}
	)
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
