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
	maxApy: z
		.string()
		.describe('The max APY for the AVS across all the strategies')
		.openapi({ example: '1.0' }),
	rewardsSubmissions: z
		.array(RewardsSubmissionSchema)
		.describe('List of rewards submissions associated with AVS')
})

export const OperatorRewardsSchema = z.object({
	avsAddress: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	maxApy: z
		.number()
		.describe(
			'The max APY for the AVS Operator across all the strategies after deducting the operator fee'
		)
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
