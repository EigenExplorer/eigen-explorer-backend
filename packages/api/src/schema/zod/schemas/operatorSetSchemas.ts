import z from '../'
import { EthereumAddressSchema } from './base/ethereumAddress'

const OperatorSetIdSchema = z
	.string()
	.regex(/^\d+$/, 'Invalid operator set ID')
	.transform((val) => parseInt(val))

export const StrategyAddressQuerySchema = z.object({
	strategyAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address of the restaking strategy')
})

const BaseOperatorSetObjectSchema = z.object({
	avsAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address of the AVS'),
	operatorSetId: OperatorSetIdSchema.optional()
})

// Refinement function
const requireAvsAddressForOperatorSetId = (schema: z.ZodTypeAny) =>
	schema.refine(
		(data) => {
			if (data.operatorSetId !== undefined) {
				return data.avsAddress !== undefined
			}
			return true
		},
		{
			message: "'operatorSetId' requires 'avsAddress' to be provided",
			path: ['operatorSetId']
		}
	)

export const OperatorSetQuerySchema = requireAvsAddressForOperatorSetId(BaseOperatorSetObjectSchema)

export const OperatorSetQuerySchemaWithRegistered = requireAvsAddressForOperatorSetId(
	BaseOperatorSetObjectSchema.extend({
		registered: z
			.enum(['true', 'false'])
			.transform((val) => val === 'true')
			.optional()
			.describe('If the Operator is registered in the Operator Set')
	})
)

export const OperatorAllocationQuerySchema = requireAvsAddressForOperatorSetId(
	BaseOperatorSetObjectSchema.extend({ ...StrategyAddressQuerySchema.shape })
)

export const AvsOperatorSetQuerySchema = z.object({
	operatorAddress: z
		.string()
		.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
		.optional()
		.describe('The address of the Operator'),
	operatorSetId: OperatorSetIdSchema.optional()
})

export const AvsAllocationQuerySchema = AvsOperatorSetQuerySchema.extend({
	...StrategyAddressQuerySchema.shape
})

export const AvsOperatorSetParamsSchema = z.object({
	address: EthereumAddressSchema,
	operatorSetId: OperatorSetIdSchema
})
