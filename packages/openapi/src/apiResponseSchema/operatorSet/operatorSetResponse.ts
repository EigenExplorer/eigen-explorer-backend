import z from '../../../../api/src/schema/zod'

// Reusable Common Schemas
const EthereumAddressSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
	.describe('A valid Ethereum address starting with 0x followed by 40 hexadecimal characters')

const OperatorSetIdSchema = z
	.number()
	.describe('The ID of the operator-set')
	.openapi({ example: 0 })

const StrategyAddressSchema = z
	.string()
	.regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
	.describe('The strategy contract address')
	.openapi({ example: '0x7d704507b76571a51d9cae8addabbfd0ba0e63d3' })

const TimestampSchema = z
	.string()
	.describe('The timestamp as an ISO 8601 string')
	.openapi({ example: '2025-02-01T00:00:00.000Z' })

const BlockNumberSchema = z.number().describe('The block number').openapi({ example: 3325343 })

// Base schema for common timestamp fields
const TimestampFieldsSchema = z.object({
	createdAt: TimestampSchema.describe(
		'The timestamp when the record was created as an ISO 8601 string'
	),
	createdAtBlock: BlockNumberSchema.describe('The block number when the record was created'),
	updatedAt: TimestampSchema.describe(
		'The timestamp when the record was last updated as an ISO 8601 string'
	),
	updatedAtBlock: BlockNumberSchema.describe('The block number when the record was last updated')
})

// Base schema for operator-set fields
const OperatorSetBaseSchema = z.object({
	avsAddress: EthereumAddressSchema.describe('The AVS contract address').openapi({
		example: '0xba7cda36abeb28ad200591e6e4a963359b1f43df'
	}),
	operatorSetId: OperatorSetIdSchema,
	strategies: z.array(StrategyAddressSchema).describe('Array of strategy contract addresses')
})

// Base schema for allocation fields
const AllocationBaseSchema = z.object({
	operatorAddress: EthereumAddressSchema.describe('The operator contract address').openapi({
		example: '0xd9322bb31f42c7caa12daad49699d655393f9524'
	}),
	strategyAddress: StrategyAddressSchema,
	magnitude: z
		.string()
		.describe(
			'The allocation magnitude applicable for this operator-set/strategy pair from effectBlock'
		)
		.openapi({ example: '100000' }),
	effectBlock: BlockNumberSchema.describe(
		'The block number when the allocated magnitude takes effect'
	).openapi({
		example: 3326552
	})
})

// AVS Routes

// 1. List operator-sets Under an AVS
export const AvsOperatorSetsSchema = OperatorSetBaseSchema.merge(TimestampFieldsSchema)

// 2. Specific operator-set Details
export const AvsOperatorSetDetailsSchema = OperatorSetBaseSchema.merge(
	z.object({
		totalStakers: z
			.number()
			.describe('The count of stakers whose delegated operator is registered in the operator-set')
			.openapi({ example: 1 }),
		totalOperators: z
			.number()
			.describe('The count of operators registered in the operator-set')
			.openapi({ example: 1 }),
		allocations: z.array(AllocationBaseSchema)
	})
).merge(TimestampFieldsSchema)

// 3. List Allocations Under an AVS
export const AvsAllocationsSchema = OperatorSetBaseSchema.pick({
	avsAddress: true,
	operatorSetId: true
})
	.merge(AllocationBaseSchema)
	.merge(TimestampFieldsSchema)

// 4. List Slashing Events Under an AVS
export const AvsSlashedSchema = OperatorSetBaseSchema.pick({
	avsAddress: true,
	operatorSetId: true
})
	.merge(
		z.object({
			operatorAddress: EthereumAddressSchema.describe('The operator contract address').openapi({
				example: '0xd9322bb31f42c7caa12daad49699d655393f9524'
			}),
			strategies: z.array(StrategyAddressSchema).describe('Array of strategy contract addresses'),
			wadSlashed: z
				.array(z.string())
				.describe(
					"Array of proportions of the operator's total allocated (slashable) stake being slashed for each strategy, expressed in WAD (1e18) units"
				)
				.openapi({ example: ['0', '0'] }),
			description: z
				.string()
				.describe('Description of the slashing event')
				.openapi({ example: 'temp' })
		})
	)
	.merge(TimestampFieldsSchema)

// Operator Routes

// 1. List operator-sets an Operator Belongs To
export const OperatorSetsSchema = OperatorSetBaseSchema.pick({
	avsAddress: true,
	operatorSetId: true
})
	.merge(
		z.object({
			operatorAddress: EthereumAddressSchema.describe('The operator contract address').openapi({
				example: '0xd9322bb31f42c7caa12daad49699d655393f9524'
			}),
			registered: z
				.boolean()
				.describe('Whether the operator is registered in the operator-set')
				.openapi({ example: true }),
			slashableUntil: z
				.number()
				.optional()
				.describe('Block number until which operator can be slashed after deregistration')
				.openapi({ example: 3312767 })
		})
	)
	.merge(TimestampFieldsSchema)

// 2. List Operator's Allocations
export const OperatorAllocationsSchema = OperatorSetBaseSchema.pick({
	avsAddress: true,
	operatorSetId: true
})
	.merge(AllocationBaseSchema)
	.merge(TimestampFieldsSchema)

// 3. List Slashing Events for an Operator
export const OperatorSlashedSchema = OperatorSetBaseSchema.pick({
	avsAddress: true,
	operatorSetId: true
})
	.merge(
		z.object({
			operatorAddress: EthereumAddressSchema.describe('The operator contract address').openapi({
				example: '0xd9322bb31f42c7caa12daad49699d655393f9524'
			}),
			strategies: z.array(StrategyAddressSchema).describe('Array of strategy contract addresses'),
			wadSlashed: z
				.array(z.string())
				.describe(
					"Array of proportions of the operator's total allocated (slashable) stake being slashed for each strategy, expressed in WAD (1e18) units"
				)
				.openapi({ example: ['0', '0'] }),
			description: z
				.string()
				.describe('Description of the slashing event')
				.openapi({ example: 'temp' })
		})
	)
	.merge(TimestampFieldsSchema)

// 4. Get Operator's Allocation Delay
export const OperatorAllocationDelaySchema = z
	.object({
		operatorAddress: EthereumAddressSchema.describe('The operator contract address').openapi({
			example: '0xd9322bb31f42c7caa12daad49699d655393f9524'
		}),
		delay: z
			.number()
			.describe(
				'The allocation delay in blocks i.e no. of blocks between an operator allocating magnitude to an operator-set, and the magnitude becoming slashable'
			)
			.openapi({ example: 0 }),
		effectBlock: BlockNumberSchema.describe('The block number when the delay takes effect').openapi(
			{
				example: 3325366
			}
		)
	})
	.merge(TimestampFieldsSchema)

// 5. Operator Magnitudes
export const OperatorMagnitudesSchema = z
	.object({
		operatorAddress: EthereumAddressSchema.describe('The operator contract address').openapi({
			example: '0xd9322bb31f42c7caa12daad49699d655393f9524'
		}),
		strategyAddress: StrategyAddressSchema,
		maxMagnitude: z
			.string()
			.describe(
				'The maximum magnitude that can be allocated between all operator-sets for a strategy'
			)
			.openapi({ example: '1000000000000000000' }),
		encumberedMagnitude: z
			.string()
			.describe('The currently-allocated magnitude for the strategy')
			.openapi({ example: '300000' })
	})
	.merge(TimestampFieldsSchema)
