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
			.describe('Comma-separated list of token addresses')
			.openapi({
				example:
					'0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83,0x8c1bed5b9a0928467c9b1341da1d7bd5e10b6549'
			}),
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
			.describe('Comma-separated list of amounts in raw format (decimals)')
			.openapi({ example: '382355108882807950000000,1875121808407486500000' })
	})
	.refine(
		(data) =>
			!data.tokenAddresses || !data.amounts || data.tokenAddresses.length === data.amounts.length,
		{
			message: 'tokenAddresses and amounts arrays must have equal length',
			path: ['tokenAddresses', 'amounts']
		}
	)
