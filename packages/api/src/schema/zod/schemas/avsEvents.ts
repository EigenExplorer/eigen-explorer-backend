import z from '../'
import { getValidatedDates, validateDateRange } from '../../../utils/dateUtils'

const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/

export const AvsEventQuerySchema = z
	.object({
		txHash: z
			.string()
			.regex(/^0x([A-Fa-f0-9]{64})$/, 'Invalid transaction hash')
			.optional()
			.describe('The transaction hash associated with the event')
			.openapi({ example: '0xf165ff09ccfd163be9050c6c634424be960c2c6b410032e4cb03c1558999f77f' }),
		rewardsSubmissionHash: z
			.string()
			.regex(/^0x([A-Fa-f0-9]{64})$/, 'Invalid reward submission hash')
			.optional()
			.describe('The reward submission hash associated with the event')
			.openapi({ example: '0x5dab8f8e6b17168e3097cec2a9c2840232b47c5cd9a0fbd1ef2e448a8edd064d' }),
		rewardsSubmissionToken: z
			.string()
			.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
			.optional()
			.describe('The token address used for the rewards submission')
			.openapi({ example: '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb' }),
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

export default AvsEventQuerySchema
