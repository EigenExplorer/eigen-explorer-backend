import z from '../'

export const WithdrawalListQuerySchema = z.object({
	stakerAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional(),

	delegatedTo: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional(),

	strategyAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional(),

	status: z.enum(['queued', 'queued_withdrawable', 'completed']).optional()
})
