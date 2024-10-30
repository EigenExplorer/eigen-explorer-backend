import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

const SubmissionStrategySchema = z.object({
	strategyAddress: EthereumAddressSchema.describe('The address of the restaking strategy').openapi({
		example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7'
	}),
	multiplier: z.string().describe('The multiplier associated with this strategy').openapi({
		example: '1000000000000000000'
	}),
	amount: z
		.string()
		.describe(
			'The amount of rewards allocated to this strategy from the total rewards in this submissionn'
		)
		.openapi({
			example: '5000000000000000000'
		})
})

const RewardsSubmissionSchema = z.object({
	rewardsSubmissionHash: z.string().describe('The hash of the rewards submission').openapi({
		example: '0x141e6ea51d92c9ceaefbd5d1ac1b5f1c2ee06555ef20e224ff23ec3448edb7dd'
	}),
	startTimestamp: z
		.number()
		.describe('The timestamp marking the start of this rewards distribution period')
		.openapi({ example: 1720000000 }),
	duration: z
		.number()
		.describe('The duration (in seconds) over which the rewards are distributed')
		.openapi({ example: 2500000 }),
	totalAmount: z
		.string()
		.describe('The total amount of rewards allocated in this submission')
		.openapi({
			example: '5000000000000000000'
		}),
	tokenAddress: EthereumAddressSchema.describe(
		'The contract address of the token used for rewards distribution'
	).openapi({
		example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
	}),
	strategies: z
		.array(SubmissionStrategySchema)
		.describe('List of strategies involved in the rewards submission')
})

export const AvsRewardsSchema = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	submissions: z
		.array(RewardsSubmissionSchema)
		.describe('The list of of individual rewards submissions associated with the AVS'),
	totalRewards: z
		.string()
		.describe('The aggregate amount of rewards distributed across all submissions')
		.openapi({ example: '1000000000000000000' }),
	totalSubmissions: z
		.number()
		.describe('The total count of rewards submissions associated with the AVS')
		.openapi({ example: 10 }),
	rewardTokens: z
		.array(EthereumAddressSchema)
		.describe('The list of token addresses used for reward distribution')
		.openapi({
			example: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2']
		}),
	rewardStrategies: z
		.array(EthereumAddressSchema)
		.describe('The list of strategy addresses for which rewards are distributed')
		.openapi({
			example: [
				'0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7',
				'0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff'
			]
		})
})
