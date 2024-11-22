import z from '../'
import { getValidatedDates, validateDateRange } from '../../../utils/dateUtils'
import { WithTokenDataQuerySchema, WithEthValueQuerySchema } from './withTokenDataQuery'

const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/

const BaseStakerEventQuerySchema = z
	.object({
		txHash: z
			.string()
			.regex(/^0x([A-Fa-f0-9]{64})$/, 'Invalid transaction hash')
			.optional()
			.describe('The transaction hash associated with the event'),

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
			.describe('Start date in ISO string format'),

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
	})
	.merge(WithTokenDataQuerySchema)
	.merge(WithEthValueQuerySchema)

function refineStakerEventQuerySchema(schema: z.ZodRawShape) {
	return BaseStakerEventQuerySchema.extend(schema)
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
}

// Schema for Delegation events
export const DelegationStakerEventQuerySchema = refineStakerEventQuerySchema({
	type: z
		.enum(['SHARES_INCREASED', 'SHARES_DECREASED', 'DELEGATION', 'UNDELEGATION'])
		.optional()
		.describe('The type of the delegation event'),
	operatorAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address of the operator'),
	strategyAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The contract address of the restaking strategy')
}).refine(
	(data) => {
		if (data.type === 'DELEGATION' || data.type === 'UNDELEGATION') {
			if (data.strategyAddress || data.withTokenData || data.withEthValue) {
				return false
			}
		}
		return true
	},
	{
		message:
			"'strategyAddress','withTokenData', and 'withEthValue' filters are not supported for DELEGATION or UNDELEGATION  event types.",
		path: ['strategyAddress']
	}
)

// Schema for Deposit events
export const DepositStakerEventQuerySchema = refineStakerEventQuerySchema({
	tokenAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address')
		.optional()
		.describe('The address of the token involved in the event'),
	strategyAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid strategy address')
		.optional()
		.describe('The strategy address for filtering')
})

// Schema for Withdrawal events
export const WithdrawalStakerEventQuerySchema = refineStakerEventQuerySchema({
	type: z
		.enum(['WITHDRAWAL_QUEUED', 'WITHDRAWAL_COMPLETED'])
		.optional()
		.describe('The type of the withdrawal event'),
	withdrawalRoot: z
		.string()
		.regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid withdrawal root format')
		.optional()
		.describe('The withdrawal root associated with the event'),
	delegatedTo: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address to which funds were delegated'),
	withdrawer: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address of the withdrawer')
}).refine(
	(data) => {
		if (data.type === 'WITHDRAWAL_COMPLETED') {
			if (data.delegatedTo || data.withdrawer || data.withTokenData || data.withEthValue) {
				return false
			}
		}
		return true
	},
	{
		message:
			"'delegatedTo', 'withdrawer', 'withTokenData', and 'withEthValue' filters are not supported for WITHDRAWAL_COMPLETED event types.",
		path: ['delegatedTo', 'withdrawer', 'withTokenData', 'withEthValue']
	}
)
