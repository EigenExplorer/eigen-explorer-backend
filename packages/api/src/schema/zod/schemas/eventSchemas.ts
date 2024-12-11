import z from '../'
import { getValidatedDates, validateDateRange } from '../../../utils/eventUtils'
import {
	WithTokenDataQuerySchema,
	WithEthValueQuerySchema,
	WithIndividualAmountQuerySchema
} from './withTokenDataQuery'

const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/

// Reusable refinement functions
const refineWithEthValueRequiresTokenData = (schema: z.ZodTypeAny) =>
	schema.refine(
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

const refineStartEndDates = (schema: z.ZodTypeAny) =>
	schema
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

const refineDelegationTypeRestrictions = (schema: z.ZodTypeAny) =>
	schema.refine(
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
				"'strategyAddress', 'withTokenData', and 'withEthValue' filters are not supported for DELEGATION or UNDELEGATION event types.",
			path: ['type']
		}
	)

const refineWithdrawalTypeRestrictions = (schema: z.ZodTypeAny) =>
	schema.refine(
		(data) => {
			if (data.type === 'WITHDRAWAL_COMPLETED') {
				if (data.withdrawer || data.delegatedTo || data.withTokenData || data.withEthValue) {
					return false
				}
			}
			return true
		},
		{
			message:
				"'withdrawer', 'delegatedTo','withTokenData' and 'withEthValue' filters are not supported for WITHDRAWAL_COMPLETED event type.",
			path: ['type']
		}
	)

// Base schema for shared fields
const BaseEventQuerySchema = z.object({
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
				((isoRegex.test(val) || yyyymmddRegex.test(val)) && !Number.isNaN(new Date(val).getTime())),
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
				((isoRegex.test(val) || yyyymmddRegex.test(val)) && !Number.isNaN(new Date(val).getTime())),
			{
				message: 'Invalid date format for endAt. Use YYYY-MM-DD or ISO 8601 format.'
			}
		)
		.default('')
		.describe('End date in ISO string format')
})

const WithdrawalEventQuerySchemaBase = BaseEventQuerySchema.extend({
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
})
	.merge(WithTokenDataQuerySchema)
	.merge(WithEthValueQuerySchema)

export const WithdrawalEventQuerySchema = refineWithdrawalTypeRestrictions(
	refineWithEthValueRequiresTokenData(refineStartEndDates(WithdrawalEventQuerySchemaBase))
)

const DepositEventQuerySchemaBase = BaseEventQuerySchema.extend({
	tokenAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address')
		.optional()
		.describe('The contract address of the token'),
	strategyAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid strategy address')
		.optional()
		.describe('The contract address of the restaking strategy')
})
	.merge(WithTokenDataQuerySchema)
	.merge(WithEthValueQuerySchema)

export const DepositEventQuerySchema = refineWithEthValueRequiresTokenData(
	refineStartEndDates(DepositEventQuerySchemaBase)
)

const DelegationEventQuerySchemaBase = BaseEventQuerySchema.extend({
	type: z
		.enum(['SHARES_INCREASED', 'SHARES_DECREASED', 'DELEGATION', 'UNDELEGATION'])
		.optional()
		.describe('The type of the delegation event'),
	strategyAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The contract address of the restaking strategy')
})
	.merge(WithTokenDataQuerySchema)
	.merge(WithEthValueQuerySchema)

export const DelegationEventQuerySchema = refineDelegationTypeRestrictions(
	refineWithEthValueRequiresTokenData(refineStartEndDates(DelegationEventQuerySchemaBase))
)

export const OperatorDelegationEventQuerySchema = refineDelegationTypeRestrictions(
	refineWithEthValueRequiresTokenData(
		refineStartEndDates(
			DelegationEventQuerySchemaBase.extend({
				stakerAddress: z
					.string()
					.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
					.optional()
					.describe('The address of the staker')
			})
		)
	)
)

export const StakerDelegationEventQuerySchema = refineDelegationTypeRestrictions(
	refineWithEthValueRequiresTokenData(
		refineStartEndDates(
			DelegationEventQuerySchemaBase.extend({
				operatorAddress: z
					.string()
					.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
					.optional()
					.describe('The address of the operator')
			})
		)
	)
)

const RewardsEventQuerySchemaBase = BaseEventQuerySchema.extend({
	rewardsSubmissionHash: z
		.string()
		.regex(/^0x([A-Fa-f0-9]{64})$/, 'Invalid reward submission hash')
		.optional()
		.describe('The reward submission hash associated with the event'),
	rewardsSubmissionToken: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The token address used for the rewards submission')
})
	.merge(WithIndividualAmountQuerySchema)
	.merge(WithEthValueQuerySchema)

export const RewardsEventQuerySchema = refineStartEndDates(RewardsEventQuerySchemaBase)