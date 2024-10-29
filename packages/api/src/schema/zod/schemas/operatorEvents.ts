import z from '../'
import { getValidatedDates, validateDateRange } from '../../../utils/dateUtils'
import { WithTokenDataQuerySchema, WithEthValueQuerySchema } from './withTokenDataQuery'

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
			.enum(['SHARES_INCREASED', 'SHARES_DECREASED', 'DELEGATION', 'UNDELEGATION'])
			.optional()
			.describe('The type of the operator event')
			.openapi({ example: 'SHARES_INCREASED' }),

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
	.merge(WithTokenDataQuerySchema)
	.merge(WithEthValueQuerySchema)
	.refine(
		(data) => {
			if (data.withEthValue && !data.withTokenData) {
				return false
			}
			return true
		},
		{
			message: "'withEthValue' requires 'withTokenData' to be enabled.",
			path: ['withEthValue']
		}
	)
	.refine(
		(data) => {
			if ((data.type === 'DELEGATION' || data.type === 'UNDELEGATION') && data.strategyAddress) {
				return false
			}
			return true
		},
		{
			message:
				'strategyAddress filter is not supported for DELEGATION or UNDELEGATION event types.',
			path: ['strategyAddress']
		}
	)
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
				const dates = getValidatedDates(data.startAt, data.endAt)
				Object.assign(data, dates)

				return validateDateRange(data.startAt, data.endAt)
			} catch {
				return false
			}
		},
		{
			message: 'Duration between startAt and endAt exceeds the allowed limit of 30 days.',
			path: ['startAt', 'endAt']
		}
	)

export default OperatorEventQuerySchema
