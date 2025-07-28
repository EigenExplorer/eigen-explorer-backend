import z from '../'

export const PiDetailsQuerySchema = z
	.object({
		tokenAddresses: z
			.string()
			.optional()
			.transform((val) => {
				if (!val) return []
				return val
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0)
			})
			.refine((arr) => arr.every((item) => /^0x[a-fA-F0-9]{40}$/.test(item)), {
				message: 'Each token address must be a valid Ethereum address'
			})
			.describe('Comma-separated token addresses (no quotes), like 0xec5...83,0x8c1...49'),
		amounts: z
			.string()
			.optional()
			.transform((val) => {
				if (!val) return []
				return val
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0)
			})
			.refine((arr) => arr.every((item) => /^\d+$/.test(item)), {
				message: 'Each amount must be a valid non-negative integer'
			})
			.describe('Comma-separated raw amounts (no quotes), like 500000000000000000000,100000000000')
	})
	.refine(
		(data) =>
			!data.tokenAddresses || !data.amounts || data.tokenAddresses.length === data.amounts.length,
		{
			message: 'tokenAddresses and amounts arrays must have equal length',
			path: ['tokenAddresses', 'amounts']
		}
	)
