import z from '../'

const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/

export const OperatorEventQuerySchema = z
	.object({
		stakerAddress: z
			.string()
			.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
			.optional()
			.describe('The address of the staker')
			.openapi({ example: '0x74ede5f75247fbdb9266d2b3a7be63b3db7611dd' }),

		strategyAddress: z
			.string()
			.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
			.optional()
			.describe('The contract address of the restaking strategy')
			.openapi({ example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6' }),

		txHash: z
			.string()
			.regex(/^0x([A-Fa-f0-9]{64})$/, 'Invalid transaction hash')
			.optional()
			.describe('The transaction hash associated with the event')
			.openapi({ example: '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb' }),

		type: z
			.enum(['shares increased', 'shares decreased', 'delegation', 'undelegation'])
			.optional()
			.describe('The type of the operator event')
			.openapi({ example: 'shares increased' }),

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
			.openapi({ example: '2024-04-11T08:31:11.000' })
	})
	.refine(
		(data) => {
			if (
				(data.type === 'delegation' || data.type === 'undelegation') &&
				(data.strategyAddress || data.stakerAddress)
			) {
				return false
			}
			return true
		},
		{
			message:
				'Neither strategyAddress nor stakerAddress should be provided for delegation or undelegation event types.',
			path: ['strategyAddress', 'stakerAddress']
		}
	)
