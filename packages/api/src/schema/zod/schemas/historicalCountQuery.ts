import z from '..'

export const HistoricalCountSchema = z.object({
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

export default HistoricalCountSchema
