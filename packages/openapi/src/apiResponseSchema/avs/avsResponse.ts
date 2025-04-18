import z from '../../../../api/src/schema/zod'
import { AvsMetaDataSchema } from '../../../../api/src/schema/zod/schemas/base/avsMetaData'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { StrategySharesSchema } from '../../../../api/src/schema/zod/schemas/base/strategyShares'
import { CuratedMetadataSchema } from '../base/curatedMetadataResponses'
import { StrategyApySchema } from '../base/strategyApyResponse'
import { TvlSchema } from '../base/tvlResponses'

export const AvsSchema = z.object({
	address: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x35f4f28a8d3ff20eed10e087e8f96ea2641e6aa1'
	}),
	metadataName: AvsMetaDataSchema.shape.metadataName,
	metadataDescription: AvsMetaDataSchema.shape.metadataDescription,
	metadataDiscord: AvsMetaDataSchema.shape.metadataDiscord,
	metadataLogo: AvsMetaDataSchema.shape.metadataLogo,
	metadataTelegram: AvsMetaDataSchema.shape.metadataTelegram,
	metadataWebsite: AvsMetaDataSchema.shape.metadataWebsite,
	metadataX: AvsMetaDataSchema.shape.metadataX,
	totalStakers: z
		.number()
		.describe('The total number of stakers staking in the AVS')
		.openapi({ example: 10 }),
	totalOperators: z
		.number()
		.describe('The total number of operators operating the AVS')
		.openapi({ example: 10 }),
	maxApy: z
		.string()
		.describe('The max APY for the AVS across all the strategies')
		.openapi({ example: '1.0' }),
	createdAtBlock: z
		.string()
		.describe('The block number at which the AVS was created')
		.openapi({ example: '19631203' }),
	updatedAtBlock: z
		.string()
		.describe('The block number at which the AVS was last updated')
		.openapi({ example: '19631203' }),
	createdAt: z
		.string()
		.describe('The time stamp at which the AVS was created')
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	updatedAt: z
		.string()
		.describe('The time stamp at which the AVS was last updated')
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	// tags: z
	//     .array(z.string())
	//     .optional()
	//     .describe('The tags associated with the AVS')
	//     .openapi({ example: ['DA', 'DeFi'] }),
	curatedMetadata: CuratedMetadataSchema.optional()
		.describe('To curate visibility and additional information of the AVS ')
		.openapi({
			example: {
				avsAddress: '0x2344c0fe02ccd2b32155ca0ffcb1978a6d96a552',
				metadataName: 'Example AVS',
				metadataDescription: 'This is an example AVS',
				metadataDiscord: 'https://discord.com/invite/example',
				metadataLogo: "The URL of the AVS's logo",
				metadataTelegram: "The URL of the AVS's Telegram channel",
				metadataWebsite: 'https://example.com',
				metadataX: 'https://twitter.com/example',
				metadataGithub: 'https://github.com/example',
				metadataTokenAddress: '0x2344c0fe02ccd2b32155ca0ffcb1978a6d96a552',
				tags: ['Example tag 1', 'Example tag 2'],
				isVisible: true,
				isVerified: true
			}
		}),
	shares: z
		.array(StrategySharesSchema)
		.describe('The strategy shares held in the AVS')
		.openapi({
			example: [
				{
					strategyAddress: '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
					shares: '1000000000000000000000'
				},
				{
					strategyAddress: '0x54945180db7943c0ed0fee7edab2bd24620256bc',
					shares: '1000000000000000000000'
				}
			]
		}),
	tvl: TvlSchema.optional()
		.describe('The total value locked (TVL) in the AVS')
		.openapi({
			example: {
				tvl: 1000000,
				tvlBeaconChain: 1000000,
				tvlWETH: 1000000,
				tvlRestaking: 1000000,
				tvlStrategies: {
					Eigen: 1000000,
					cbETH: 2000000
				},
				tvlStrategiesEth: {
					stETH: 1000000,
					cbETH: 2000000
				}
			}
		})
})

export const RewardsSchema = z.object({
	strategyApys: z
		.array(StrategyApySchema)
		.describe('An array of strategies with their respective APYs and token details')
})

export const AvsWithRewardsSchema = AvsSchema.extend({
	rewards: RewardsSchema.describe('The reward details for the AVS, including strategies and APYs')
})
