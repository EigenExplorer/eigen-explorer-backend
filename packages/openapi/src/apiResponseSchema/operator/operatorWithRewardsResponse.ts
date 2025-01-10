import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AvsMetaDataSchema } from '../../../../api/src/schema/zod/schemas/base/avsMetaData'
import { CuratedMetadataSchema } from '.././base/curatedMetadataResponses'
import { OperatorResponseSchema } from './operatorResponse'
import { StrategyApySchema } from '../base/strategyApyResponse'

export const AvsRegistrationSchema = z.object({
	avsAddress: EthereumAddressSchema.describe('The address of the AVS contract').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	isActive: z
		.boolean()
		.describe(
			'True indicates operator is an active participant while False indicates it used to be one but not anymore'
		)
		.openapi({ example: false })
})

export const AvsMetaDataFields = z.object({
	metadataName: AvsMetaDataSchema.shape.metadataName,
	metadataDescription: AvsMetaDataSchema.shape.metadataDescription,
	metadataDiscord: AvsMetaDataSchema.shape.metadataDiscord,
	metadataLogo: AvsMetaDataSchema.shape.metadataLogo,
	metadataTelegram: AvsMetaDataSchema.shape.metadataTelegram,
	metadataWebsite: AvsMetaDataSchema.shape.metadataWebsite,
	metadataX: AvsMetaDataSchema.shape.metadataX,
	metadataUrl: z.string().describe('URL for AVS metadata').openapi({
		example: 'https://example.json'
	})
})

export const RewardsSubmissionSchema = z.object({
	id: z.number().describe('Id for the rewards submission').openapi({ example: 1 }),
	submissionNonce: z
		.number()
		.describe('The nonce of the rewards submission')
		.openapi({ example: 0 }),
	rewardsSubmissionHash: z.string().describe('The hash of the rewards submission').openapi({
		example: '0x2bc2f7cef0974f7064dbdae054f9a0e5ea1c2293d180a749c70100506382d85'
	}),
	avsAddress: EthereumAddressSchema.describe('AVS address for the rewards submission').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	strategyAddress: EthereumAddressSchema.describe(
		'Strategy address for the rewards submission'
	).openapi({
		example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6'
	}),
	multiplier: z
		.string()
		.describe('The multiplier associated with this strategy')
		.openapi({ example: '1000000000000000000' }),
	token: EthereumAddressSchema.describe(
		'The contract address of the token used for rewards distribution'
	).openapi({
		example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
	}),
	amount: z
		.string()
		.describe('The amount of rewards allocated to this strategy from the total rewards')
		.openapi({ example: '300000000000000000' }),
	startTimestamp: z
		.number()
		.describe('The timestamp marking the start of this rewards distribution period')
		.openapi({ example: 1720000000 }),
	duration: z
		.number()
		.describe('The duration (in seconds) over which the rewards are distributed')
		.openapi({ example: 2500000 }),
	createdAtBlock: z
		.number()
		.describe('The block number at which the reward submission was recorded')
		.openapi({ example: 20495824 }),
	createdAt: z
		.string()
		.describe('The timestamp at which the reward submission was recorded')
		.openapi({
			example: '2024-08-10T04:28:47.000Z'
		})
})

export const OperatorDetailsSchema = z.object({
	address: EthereumAddressSchema.describe('The contract address of the AVS operator').openapi({
		example: '0x09e6eb09213bdd3698bd8afb43ec3cb0ecff683a'
	}),
	metadataUrl: z.string().describe('URL for operator metadata').openapi({
		example: 'https://raw.githubusercontent.com/github-infstones/eigenlayer/main/metadata.json'
	}),
	metadataName: z
		.string()
		.describe('The name of the AVS operator')
		.openapi({ example: 'Example AVS Operator' }),
	metadataDescription: z.string().nullable().describe('Description of the operator').openapi({
		example: 'This is an example AVS operator'
	}),
	metadataDiscord: z
		.string()
		.nullable()
		.describe("The URL of the AVS operator's Discord server")
		.openapi({ example: 'https://discord.com/invite/example' }),
	metadataLogo: z.string().nullable().describe('Logo URL').openapi({
		example: '<string>'
	}),
	metadataTelegram: z
		.string()
		.nullable()
		.describe("The URL of the AVS operator's Telegram channel")
		.openapi({ example: 'https://t.me/example' }),
	metadataWebsite: z
		.string()
		.nullable()
		.describe("The URL of the AVS operator's website")
		.openapi({ example: 'https://example.com' }),
	metadataX: z
		.string()
		.nullable()
		.describe("The URL of the AVS operator's X")
		.openapi({ example: 'https://twitter.com/example' }),
	isMetadataSynced: z
		.boolean()
		.describe('Indicates if metadata is synced')
		.openapi({ example: true }),
	totalStakers: z
		.number()
		.describe('The total number of stakers who have delegated to this AVS operator')
		.openapi({ example: 20000 }),
	totalAvs: z
		.number()
		.describe('The total number of AVS opted by the AVS operator')
		.openapi({ example: 10 }),
	apy: z.string().describe('The latest APY recorded for the operator').openapi({ example: '1.0' }),
	tvlEth: z.string().describe('Total TVL in ETH').openapi({ example: '30000' }),
	sharesHash: z.string().describe('Shares hash for the operator').openapi({
		example: '0c67d2a677454013c442732ee3bcf07b'
	}),
	createdAtBlock: z
		.number()
		.describe('The block number at which the AVS Operator was registered')
		.openapi({ example: 19613775 }),
	updatedAtBlock: z
		.number()
		.describe('The block number at which the AVS Operator registration was last updated')
		.openapi({ example: 19613775 }),
	createdAt: z
		.string()
		.describe('The time stamp at which the AVS Operator was registered')
		.openapi({
			example: '2024-04-08T21:58:35.000Z'
		}),
	updatedAt: z
		.string()
		.describe('The time stamp at which the AVS Operator registration was last updated')
		.openapi({
			example: '2024-04-08T21:58:35.000Z'
		}),
	shares: z
		.array(
			z.object({
				operatorAddress: EthereumAddressSchema.describe(
					'The contract address of the AVS operator'
				).openapi({
					example: '0x4cd2086e1d708e65db5d4f5712a9ca46ed4bbd0a'
				}),
				strategyAddress: EthereumAddressSchema.describe(
					'The contract address of the restaking strategy'
				).openapi({
					example: '0x73a18a6304d05b495ecb161dbf1ab496461bbf2e'
				}),
				shares: z
					.string()
					.describe('The amount of shares held in the strategy')
					.openapi({ example: '1000000000000000000000' })
			})
		)
		.describe('The strategy shares held in the AVS operator')
})

export const OperatorSchema = z.object({
	avsAddress: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	operatorAddress: EthereumAddressSchema.describe(
		'The contract address of the AVS operator'
	).openapi({
		example: '0x4cd2086e1d708e65db5d4f5712a9ca46ed4bbd0a'
	}),
	isActive: z
		.boolean()
		.describe(
			'True indicates operator is an active participant while False indicates it used to be one but not anymore'
		)
		.openapi({ example: true }),
	restakedStrategies: z
		.array(EthereumAddressSchema)
		.describe('List of strategies restaked by the operator')
		.openapi({
			example: [
				'0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0',
				'0x93c4b944d05dfe6df7645a86cd2206016c51564d'
			]
		}),
	createdAtBlock: z
		.number()
		.describe('The block number at which the AVS Operator was registered')
		.openapi({ example: 19614553 }),
	updatedAtBlock: z
		.number()
		.describe('The block number at which the AVS Operator registration was last updated')
		.openapi({ example: 19614553 }),
	createdAt: z
		.string()
		.describe('The time stamp at which the AVS Operator was registered')
		.openapi({
			example: '2024-04-09T00:35:35.000Z'
		}),
	updatedAt: z
		.string()
		.describe('The time stamp at which the AVS Operator registration was last updated')
		.openapi({
			example: '2024-04-09T00:35:35.000Z'
		}),
	operator: OperatorDetailsSchema
})

export const DetailedAvsRegistrationSchema = AvsRegistrationSchema.merge(AvsMetaDataFields).extend({
	curatedMetadata: CuratedMetadataSchema.omit({ avsAddress: true })
		.optional()
		.describe('Curated metadata information for AVS'),
	restakeableStrategies: z
		.array(EthereumAddressSchema)
		.describe('The list of restakeable strategies for AVS'),
	totalStakers: z.number().describe('Total number of stakers').openapi({ example: 80000 }),
	totalOperators: z.number().describe('Total number of operators').openapi({ example: 200 }),
	tvlEth: z.string().describe('Total TVL in ETH').openapi({ example: '3000000' }),
	createdAtBlock: z
		.number()
		.describe('The block number at which the AVS was created')
		.openapi({ example: 19592323 }),
	updatedAtBlock: z
		.number()
		.describe('The block number at which the AVS was last updated')
		.openapi({ example: 19592323 }),
	createdAt: z.string().describe('The time stamp at which the AVS was created').openapi({
		example: '2024-04-05T21:49:59.000Z'
	}),
	updatedAt: z.string().describe('The time stamp at which the AVS was last updated').openapi({
		example: '2024-04-05T21:49:59.000Z'
	}),
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	rewardsSubmissions: z
		.array(RewardsSubmissionSchema)
		.describe('List of rewards submissions associated with AVS'),
	operators: z
		.array(OperatorSchema)
		.describe('List of operators associated with the AVS registration')
})

export const OperatorRewardsSchema = z.object({
	avsAddress: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	maxApy: z
		.number()
		.describe('The max APY for the AVS Operator across all the strategies')
		.openapi({ example: 0.1 }),
	strategyApys: z.array(StrategyApySchema)
})

export const OperatorWithRewardsResponseSchema = OperatorResponseSchema.extend({
	avsRegistrations: z
		.array(DetailedAvsRegistrationSchema)
		.describe('Detailed AVS registrations information for the operator'),
	rewards: z
		.array(OperatorRewardsSchema)
		.describe('The reward details for the operator, including strategies and APYs')
})
