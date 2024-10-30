import z from '../../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { AvsMetaDataSchema } from '../../../../api/src/schema/zod/schemas/base/avsMetaData'
import { CuratedMetadataSchema } from '.././base/curatedMetadataResponses'
import { OperatorResponseSchema } from './operatorResponse'

export const AvsRegistrationSchema = z.object({
	avsAddress: EthereumAddressSchema.describe('The address of the AVS contract').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	isActive: z.boolean().describe('Status of the AVS registration').openapi({ example: false })
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
		example: 'https://mainnet-ethereum-avs-metadata.s3.amazonaws.com/EigenDA.json'
	})
})

export const RewardsSubmissionSchema = z.object({
	id: z.number().describe('Unique ID of the rewards submission').openapi({ example: 1 }),
	submissionNonce: z.number().describe('Nonce of the rewards submission').openapi({ example: 0 }),
	rewardsSubmissionHash: z.string().describe('Hash of the rewards submission').openapi({
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
		.describe('Multiplier for the rewards')
		.openapi({ example: '1055446649335815388' }),
	token: EthereumAddressSchema.describe('Token address for rewards').openapi({
		example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
	}),
	amount: z.string().describe('Amount of the rewards').openapi({ example: '386651387601193218' }),
	startTimestamp: z
		.number()
		.describe('Start timestamp of rewards')
		.openapi({ example: 1723075200 }),
	duration: z.number().describe('Duration of the rewards').openapi({ example: 2419200 }),
	createdAtBlock: z.number().describe('Block number at creation').openapi({ example: 20495824 }),
	createdAt: z.string().describe('Creation timestamp').openapi({
		example: '2024-08-10T04:28:47.000Z'
	})
})

export const OperatorDetailsSchema = z.object({
	address: EthereumAddressSchema.describe('Operator address').openapi({
		example: '0x4cd2086e1d708e65db5d4f5712a9ca46ed4bbd0a'
	}),
	metadataUrl: z.string().describe('URL for operator metadata').openapi({
		example: 'https://raw.githubusercontent.com/github-infstones/eigenlayer/main/metadata.json'
	}),
	metadataName: z.string().describe('Name of the operator').openapi({ example: 'InfStones' }),
	metadataDescription: z.string().nullable().describe('Description of the operator').openapi({
		example:
			'InfStones is committed to supporting a wide range of AVSes and reward delegators through our Giveaway! Learn more: https://infstones.com/'
	}),
	metadataDiscord: z.string().nullable().describe('Discord link').openapi({ example: '' }),
	metadataLogo: z.string().nullable().describe('Logo URL').openapi({
		example: 'https://raw.githubusercontent.com/github-infstones/eigenlayer/main/logo_white.png'
	}),
	metadataTelegram: z.string().nullable().describe('Telegram link').openapi({ example: '' }),
	metadataWebsite: z
		.string()
		.nullable()
		.describe('Website URL')
		.openapi({ example: 'https://infstones.com' }),
	metadataX: z
		.string()
		.nullable()
		.describe('Twitter link')
		.openapi({ example: 'https://twitter.com/InfStones' }),
	isMetadataSynced: z
		.boolean()
		.describe('Indicates if metadata is synced')
		.openapi({ example: true }),
	totalStakers: z
		.number()
		.describe('Total number of stakers for the operator')
		.openapi({ example: 22375 }),
	totalAvs: z.number().describe('Total AVSes operated').openapi({ example: 17 }),
	apy: z.string().describe('Current APY for the operator').openapi({ example: '1.1796' }),
	tvlEth: z.string().describe('Total TVL in ETH').openapi({ example: '38817.22857187' }),
	sharesHash: z.string().describe('Shares hash for the operator').openapi({
		example: '0c67d2a677454013c442732ee3bcf07b'
	}),
	createdAtBlock: z.number().describe('Creation block number').openapi({ example: 19613775 }),
	updatedAtBlock: z.number().describe('Last update block number').openapi({ example: 19613775 }),
	createdAt: z.string().describe('Creation timestamp').openapi({
		example: '2024-04-08T21:58:35.000Z'
	}),
	updatedAt: z.string().describe('Last update timestamp').openapi({
		example: '2024-04-08T21:58:35.000Z'
	}),
	shares: z
		.array(
			z.object({
				operatorAddress: EthereumAddressSchema.describe('Operator address').openapi({
					example: '0x4cd2086e1d708e65db5d4f5712a9ca46ed4bbd0a'
				}),
				strategyAddress: EthereumAddressSchema.describe('Strategy address').openapi({
					example: '0x73a18a6304d05b495ecb161dbf1ab496461bbf2e'
				}),
				shares: z.string().describe('Shares amount').openapi({ example: '1769899853080271886659' })
			})
		)
		.describe('Shares held by the operator in various strategies')
})

export const OperatorSchema = z.object({
	avsAddress: EthereumAddressSchema.describe('AVS address associated with operator').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	operatorAddress: EthereumAddressSchema.describe('Operator contract address').openapi({
		example: '0x4cd2086e1d708e65db5d4f5712a9ca46ed4bbd0a'
	}),
	isActive: z.boolean().describe('Operator active status').openapi({ example: true }),
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
		.describe('Creation block number for operator')
		.openapi({ example: 19614553 }),
	updatedAtBlock: z
		.number()
		.describe('Last update block number for operator')
		.openapi({ example: 19614553 }),
	createdAt: z.string().describe('Creation timestamp for operator').openapi({
		example: '2024-04-09T00:35:35.000Z'
	}),
	updatedAt: z.string().describe('Last update timestamp for operator').openapi({
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
	totalStakers: z.number().describe('Total number of stakers').openapi({ example: 80426 }),
	totalOperators: z.number().describe('Total number of operators').openapi({ example: 220 }),
	tvlEth: z.string().describe('Total TVL in ETH').openapi({ example: '3562188.35141025' }),
	createdAtBlock: z.number().describe('Creation block number').openapi({ example: 19592323 }),
	updatedAtBlock: z.number().describe('Last update block number').openapi({ example: 19592323 }),
	createdAt: z.string().describe('Creation timestamp').openapi({
		example: '2024-04-05T21:49:59.000Z'
	}),
	updatedAt: z.string().describe('Last update timestamp').openapi({
		example: '2024-04-05T21:49:59.000Z'
	}),
	address: EthereumAddressSchema.describe('AVS operator address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	rewardsSubmissions: z
		.array(RewardsSubmissionSchema)
		.describe('List of rewards submissions associated with AVS'),
	operators: z
		.array(OperatorSchema)
		.describe('List of operators associated with the AVS registration')
})

export const OperatorWithRewardsResponseSchema = OperatorResponseSchema.extend({
	avsRegistrations: z
		.array(DetailedAvsRegistrationSchema)
		.describe('Detailed AVS registrations information for the operator')
})
