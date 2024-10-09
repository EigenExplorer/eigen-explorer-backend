import z from '../../../api/src/schema/zod'
import { OperatorMetaDataSchema } from '../../../api/src/schema/zod/schemas/base/operatorMetaData'
import { EthereumAddressSchema } from '../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { TvlSchema } from './base/tvlResponses'
import { StrategySharesSchema } from '../../../api/src/schema/zod/schemas/base/strategyShares'
import { AvsRegistrationSchema } from '../../../api/src/schema/zod/schemas/base/avsRegistrations'

export const OperatorResponseSchema = z.object({
	address: EthereumAddressSchema.describe(
		'The contract address of the AVS operator'
	).openapi({ example: '0x09e6eb09213bdd3698bd8afb43ec3cb0ecff683a' }),
	metadataName: OperatorMetaDataSchema.shape.metadataName,
	metadataDescription: OperatorMetaDataSchema.shape.metadataDescription,
	metadataDiscord: OperatorMetaDataSchema.shape.metadataDiscord,
	metadataLogo: OperatorMetaDataSchema.shape.metadataLogo,
	metadataTelegram: OperatorMetaDataSchema.shape.metadataTelegram,
	metadataWebsite: OperatorMetaDataSchema.shape.metadataWebsite,
	metadataX: OperatorMetaDataSchema.shape.metadataX,
	totalStakers: z
		.number()
		.describe(
			'The total number of stakers who have delegated to this AVS operator'
		)
		.openapi({ example: 10 }),
	totalAvs: z
		.number()
		.describe('The total number of AVS opted by the AVS operator')
		.openapi({ example: 10 }),
	createdAtBlock: z
		.string()
		.describe('The block number at which the AVS Operator was registered')
		.openapi({ example: '19631203' }),
	updatedAtBlock: z
		.string()
		.describe(
			'The block number at which the AVS Operator registration was last updated'
		)
		.openapi({ example: '19631203' }),
	createdAt: z
		.string()
		.describe('The time stamp at which the AVS Operator was registered')
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	updatedAt: z
		.string()
		.describe(
			'The time stamp at which the AVS Operator registration was last updated'
		)
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	shares: z
		.array(StrategySharesSchema)
		.describe('The strategy shares held in the AVS operator')
		.openapi({
			example: [
				{
					strategyAddress: '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
					shares: '135064894598947935263152'
				},
				{
					strategyAddress: '0x54945180db7943c0ed0fee7edab2bd24620256bc',
					shares: '9323641881708650182301'
				}
			]
		}),
	avsRegistrations: z
		.array(AvsRegistrationSchema)
		.describe('Operator AVS registrations and their participation status')
		.openapi({
			example: [
				{
					avsAddress: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0',
					isActive: true
				},
				{
					avsAddress: '0xe8e59c6c8b56f2c178f63bcfc4ce5e5e2359c8fc',
					isActive: false
				}
			]
		}),
	tvl: TvlSchema.optional()
		.describe('The total value locked (TVL) in the AVS operator')
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
