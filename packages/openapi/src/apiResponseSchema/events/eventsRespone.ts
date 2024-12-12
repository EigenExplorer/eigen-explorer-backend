import z from '../../../../api/src/schema/zod'

export const EventDetailsSchema = z.object({
	tx: z.string().describe('The transaction hash').openapi({
		example: '0xae41958d0342a4485536f701c72723625131680f182eb21f95abdac6d74d0ff0'
	}),
	blockNumber: z
		.number()
		.describe('The block number of the transaction')
		.openapi({ example: 21045085 }),
	blockTime: z
		.string()
		.describe('The block time of the transaction as an ISO 8601 string')
		.openapi({
			example: '2024-10-25T20:41:11.000Z'
		})
})

const StrategySchema = z.object({
	strategy: z.string().describe('The contract address of the restaking strategy').openapi({
		example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6'
	}),
	multiplier: z
		.string()
		.describe('The multiplier associated with this strategy')
		.openapi({ example: '1068966896363604679' }),
	amount: z
		.string()
		.optional()
		.describe(
			'The amount of rewards allocated to this strategy from the total rewards in this submissionn'
		)
		.openapi({ example: '3.7932452554246293e+21' }),
	amountEthValue: z
		.number()
		.optional()
		.describe('The value of the rewards amount allocated to this strategy in ETH')
		.openapi({ example: 0.0638779707245759 })
})

const UnderlyingSchema = z.object({
	underlyingToken: z
		.string()
		.optional()
		.describe('The contract address of the token associated with this strategy')
		.openapi({
			example: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
		}),
	underlyingValue: z
		.number()
		.optional()
		.describe('The value of the shares in terms of the underlying token')
		.openapi({ example: 5.0 })
})

const EthValueSchema = z.object({
	ethValue: z
		.number()
		.optional()
		.describe('The value of the shares in ETH')
		.openapi({ example: 1.0 })
})

export const GlobalDelegationEventSchema = EventDetailsSchema.extend({
	type: z
		.enum(['DELEGATION', 'UNDELEGATION', 'SHARES_INCREASED', 'SHARES_DECREASED'])
		.describe('The type of the event')
		.openapi({ example: 'DELEGATION' }),
	args: z.object({
		operator: z.string().describe('The contract address of the AVS operator').openapi({
			example: '0x71c6f7ed8c2d4925d0baf16f6a85bb1736d412eb'
		}),
		staker: z.string().describe('The contract address of the staker').openapi({
			example: '0x42318adf0773b8af4aa8ed1670ea0af7761d07c7'
		}),
		strategy: z
			.string()
			.optional()
			.describe('The contract address of the restaking strategy')
			.openapi({
				example: '0x93c4b944d05dfe6df7645a86cd2206016c51564d'
			}),
		shares: z
			.number()
			.optional()
			.describe(
				"The change in the operator's delegated shares, added or subtracted from the total."
			)
			.openapi({ example: 62816824424188010 })
	}),
	...UnderlyingSchema.shape,
	...EthValueSchema.shape
})

export const GlobalRewardsEventSchema = EventDetailsSchema.extend({
	type: z.enum(['REWARDS']).describe('The type of the event').openapi({ example: 'REWARDS' }),
	args: z.object({
		avs: z.string().describe('AVS service manager contract address').openapi({
			example: '0x1de75eaab2df55d467494a172652579e6fa4540e'
		}),
		submissionNonce: z
			.number()
			.describe('The nonce of the rewards submission')
			.openapi({ example: 2 }),
		rewardsSubmissionHash: z.string().describe('The hash of the rewards submission').openapi({
			example: '0x1e391c015c923972811a27e1c6c3a874511e47033f1022021f29967a60ab2c87'
		}),
		rewardsSubmissionToken: z
			.string()
			.describe('The contract address of the token used for rewards distribution')
			.openapi({
				example: '0xba50933c268f567bdc86e1ac131be072c6b0b71a'
			}),
		rewardsSubmissionAmount: z
			.string()
			.describe('The total amount of rewards allocated in this submission')
			.openapi({
				example: '49000000000000000000000'
			}),
		rewardsSubmissionStartTimeStamp: z
			.number()
			.describe('The timestamp marking the start of this rewards distribution period')
			.openapi({
				example: 1728518400
			}),
		rewardsSubmissionDuration: z
			.number()
			.describe('The duration (in seconds) over which the rewards are distributed')
			.openapi({ example: 6048000 }),
		strategies: z
			.array(StrategySchema)
			.describe('List of strategies involved in the rewards submission')
	}),
	...EthValueSchema.shape
})

export const GlobalDepositEventSchema = EventDetailsSchema.extend({
	type: z.enum(['DEPOSIT']).describe('The type of the event').openapi({ example: 'DEPOSIT' }),
	args: z.object({
		staker: z.string().describe('The contract address of the staker').openapi({
			example: '0xa0e32344405b2097e738718dc27d2c2daf73e706'
		}),
		token: z.string().describe('The contract address of the token deposited').openapi({
			example: '0xec53bf9167f50cdeb3ae105f56099aaab9061f83'
		}),
		strategy: z.string().describe('The contract address of the restaking strategy').openapi({
			example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
		}),
		shares: z
			.number()
			.describe('The amount of new shares given to the staker in this strategy')
			.openapi({ example: 10190000000000000000 })
	}),
	...UnderlyingSchema.shape,
	...EthValueSchema.shape
})

export const GlobalWithdrawalEventSchema = EventDetailsSchema.extend({
	type: z
		.enum(['WITHDRAWAL_QUEUED', 'WITHDRAWAL_COMPLETED'])
		.describe('The type of the event')
		.openapi({ example: 'WITHDRAWAL_QUEUED' }),
	args: z.object({
		staker: z
			.string()
			.optional()
			.describe('The contract address of the staker who initiated the withdrawal')
			.openapi({
				example: '0x513ea5a99988252f3b2cd8382ac077d7fd26ef48'
			}),
		withdrawalRoot: z.string().describe('The root hash of the withdrawal').openapi({
			example: '0xe6cdf9110330e1648039cb98e680aeb9d1c63e022764186f1131eb9432605421'
		}),
		delegatedTo: z
			.string()
			.optional()
			.describe('The address to which the staker was delegated when the withdrawal was initiated')
			.openapi({
				example: '0x4cd2086e1d708e65db5d4f5712a9ca46ed4bbd0a'
			}),
		withdrawer: z
			.string()
			.optional()
			.describe(
				'The address of the withdrawer, authorized to complete the withdrawal and receive the funds'
			)
			.openapi({
				example: '0x513ea5a99988252f3b2cd8382ac077d7fd26ef48'
			}),
		nonce: z
			.number()
			.optional()
			.describe(
				'The nonce of the withdrawal, ensuring unique hashes for otherwise identical withdrawals'
			)
			.openapi({ example: 0 }),
		startBlock: z
			.number()
			.optional()
			.describe('The block number when the withdrawal was created')
			.openapi({ example: 21054925 }),
		strategies: z
			.array(
				z.object({
					strategy: z.string().describe('The contract address of the restaking strategy').openapi({
						example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
					}),
					shares: z
						.string()
						.describe('The amount of shares withdrawn for each strategy')
						.openapi({ example: '1000000000000000000' }),
					...UnderlyingSchema.shape,
					...EthValueSchema.shape
				})
			)
			.optional()
	})
})

export const GlobalRegistrationEventSchema = EventDetailsSchema.extend({
	type: z
		.enum(['REGISTRATION_STATUS'])
		.describe('The type of the event')
		.openapi({ example: 'REGISTRATION_STATUS' }),
	args: z.object({
		operator: z.string().describe('The contract address of the AVS operator').openapi({
			example: '0x9abce41e1486210ad83deb831afcdd214af5b49d'
		}),
		avs: z.string().describe('AVS service manager contract address').openapi({
			example: '0xb73a87e8f7f9129816d40940ca19dfa396944c71'
		}),
		status: z
			.enum(['REGISTERED', 'DEREGISTERED'])
			.describe('The status of the registration')
			.openapi({
				example: 'REGISTERED'
			})
	})
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

export const OperatorRegistrationEventSchema = GlobalRegistrationEventSchema.extend({
	args: GlobalRegistrationEventSchema.shape.args.omit({ operator: true })
})

export const AvsRegistrationEventSchema = GlobalRegistrationEventSchema.extend({
	args: GlobalRegistrationEventSchema.shape.args.omit({ avs: true })
})
