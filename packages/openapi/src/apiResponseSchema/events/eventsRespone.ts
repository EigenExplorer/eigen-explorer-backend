import z from '../../../../api/src/schema/zod'

export const EventDetailsSchema = z.object({
	type: z.string().describe('The name of the event').openapi({ example: 'Delegation' }),
	tx: z.string().describe('The transaction hash').openapi({
		example: '0x6d2b564b0f2c915c61772b7a2f23a35bd5c915e2c4d8c2eb2f2bc6a9c7075e2c'
	}),
	blockNumber: z
		.number()
		.describe('The block number of the transaction')
		.openapi({ example: 17438920 }),
	blockTime: z
		.string()
		.describe('The block time of the transaction as an ISO 8601 string')
		.openapi({
			example: '2024-12-01T14:20:00Z'
		})
})

const StrategySchema = z.object({
	strategy: z.string().describe('The strategy address').openapi({
		example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
	}),
	multiplier: z
		.string()
		.optional()
		.describe('Multiplier applied to rewards')
		.openapi({ example: '1.5' }),
	amount: z
		.string()
		.optional()
		.describe('Reward amount')
		.openapi({ example: '500000000000000000' }),
	amountEthValue: z
		.number()
		.optional()
		.describe('ETH value of the reward amount')
		.openapi({ example: 0.5 })
})

const UnderlyingSchema = z.object({
	underlyingToken: z.string().optional().describe('Underlying token address').openapi({
		example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
	}),
	underlyingValue: z
		.number()
		.optional()
		.describe('Underlying value of the token')
		.openapi({ example: 500 })
})

const EthValueSchema = z.object({
	ethValue: z.number().optional().describe('Value in ETH').openapi({ example: 1.0 })
})

export const GlobalDelegationEventSchema = EventDetailsSchema.extend({
	args: z.object({
		operator: z.string().describe('Operator address').openapi({
			example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
		}),
		staker: z.string().optional().describe('Staker address').openapi({
			example: '0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff'
		}),
		strategy: z.string().optional().describe('Strategy address').openapi({
			example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
		}),
		shares: z.number().optional().describe('Number of shares').openapi({ example: 100 })
	}),
	...UnderlyingSchema.shape,
	...EthValueSchema.shape
})

export const GlobalRewardsEventSchema = EventDetailsSchema.extend({
	args: z.object({
		avs: z.string().describe('AVS address').openapi({
			example: '0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff'
		}),
		submissionNonce: z.number().describe('Nonce of the submission').openapi({ example: 1 }),
		rewardsSubmissionHash: z.string().describe('Hash of the rewards submission').openapi({
			example: '0xe3c8e76d69f8c522a617a0f9e2158d4c785fc2f1b7c902d2b79c66309f9e7a5d'
		}),
		rewardsSubmissionToken: z.string().describe('Token used in the rewards submission').openapi({
			example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
		}),
		rewardsSubmissionAmount: z.string().describe('Amount of rewards submitted').openapi({
			example: '1000000000000000000'
		}),
		rewardsSubmissionStartTimeStamp: z
			.number()
			.describe('Start timestamp for the rewards submission')
			.openapi({
				example: 1700000000
			}),
		rewardsSubmissionDuration: z
			.number()
			.describe('Duration of the rewards submission')
			.openapi({ example: 86400 }),
		strategies: z
			.array(StrategySchema)
			.describe('List of strategies involved in the rewards submission')
	}),
	...EthValueSchema.shape
})

export const GlobalDepositEventSchema = EventDetailsSchema.extend({
	args: z.object({
		staker: z.string().describe('Staker address').openapi({
			example: '0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff'
		}),
		token: z.string().describe('Token address').openapi({
			example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
		}),
		strategy: z.string().describe('Strategy address').openapi({
			example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
		}),
		shares: z.number().describe('Number of shares').openapi({ example: 100 })
	}),
	...UnderlyingSchema.shape,
	...EthValueSchema.shape
})

export const GlobalWithdrawalEventSchema = EventDetailsSchema.extend({
	args: z.object({
		staker: z.string().describe('Staker address').openapi({
			example: '0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff'
		}),
		withdrawalRoot: z.string().describe('Root of the withdrawal').openapi({
			example: '0x7c2c47ef61e05b65e5032f5565a0c602d8c429b8d19a45e28b37c2356f5c3fdd'
		}),
		delegatedTo: z.string().optional().describe('Delegation address').openapi({
			example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
		}),
		withdrawer: z.string().optional().describe('Withdrawer address').openapi({
			example: '0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff'
		}),
		nonce: z.number().optional().describe('Nonce of the transaction').openapi({ example: 42 }),
		startBlock: z
			.number()
			.optional()
			.describe('Starting block number')
			.openapi({ example: 17000000 }),
		strategies: z
			.array(
				z.object({
					strategy: z.string().describe('Strategy address').openapi({
						example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
					}),
					shares: z.string().describe('Shares amount').openapi({ example: '1000000000000000000' }),
					...UnderlyingSchema.shape,
					...EthValueSchema.shape
				})
			)
			.optional()
	}),
	...UnderlyingSchema.shape,
	...EthValueSchema.shape
})

export const OperatorDelegationEventSchema = GlobalDelegationEventSchema.extend({
	args: GlobalDelegationEventSchema.shape.args.omit({ operator: true })
})

export const AvsRewardsEventSchema = GlobalRewardsEventSchema.extend({
	args: GlobalRewardsEventSchema.shape.args.omit({ avs: true })
})

export const StakerDelegationEventSchema = GlobalDelegationEventSchema.extend({
	args: GlobalDelegationEventSchema.shape.args.omit({ staker: true })
})

export const StakerDepositEventSchema = GlobalDepositEventSchema.extend({
	args: GlobalDepositEventSchema.shape.args.omit({ staker: true })
})

export const StakerWithdrawalEventSchema = GlobalWithdrawalEventSchema.extend({
	args: GlobalWithdrawalEventSchema.shape.args.omit({ staker: true })
})
