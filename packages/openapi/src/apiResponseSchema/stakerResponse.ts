import z from '../../../api/src/schema/zod'
import { EthereumAddressSchema } from '../../../api/src/schema/zod/schemas/base/ethereumAddress'
import { StakerStrategyApySchema, StrategyApySchema } from './base/strategyApyResponse'
import { TvlSchema } from './base/tvlResponses'

export const StakerSharesSchema = z.object({
	strategyAddress: EthereumAddressSchema.describe(
		'The contract address of the restaking strategy'
	).openapi({ example: '0x93c4b944d05dfe6df7645a86cd2206016c51564a' }),
	shares: z
		.string()
		.describe('The amount of shares held in the strategy')
		.openapi({ example: '40000000000000000' })
})

export const StakerResponseSchema = z.object({
	address: EthereumAddressSchema.describe('The contract address of the staker').openapi({
		example: '0x0000006c21964af0d420af8992851a30fa13a68b'
	}),
	operatorAddress: EthereumAddressSchema.describe('The address of the operator').openapi({
		example: '0x71c6f7ed8c2d4925d0baf16f6a85bb1736d412eb'
	}),
	createdAtBlock: z
		.string()
		.describe('The block number at which the Staker made first delegation')
		.openapi({ example: '19631203' }),
	updatedAtBlock: z
		.string()
		.describe('The block number at which the Staker made last delegation')
		.openapi({ example: '19631203' }),
	createdAt: z
		.string()
		.describe('The time stamp at which the Staker made first delegation')
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	updatedAt: z
		.string()
		.describe('The time stamp at which the Staker made last delegation')
		.openapi({ example: '2024-04-11T08:31:11.000Z' }),
	shares: z.array(StakerSharesSchema),
	tvl: TvlSchema.optional()
		.describe('The total value locked (TVL) in the AVS staker')
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

export const TokenAmountSchema = z.object({
	tokenAddress: z
		.string()
		.describe('The contract address of the token involved')
		.openapi({ example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' }),
	cumulativeAmount: z
		.string()
		.describe('The staker’s cumulative amount earned amount of this particular token')
		.openapi({ example: '1.4e-8' })
})

export const AvsApysSchema = z.object({
	avsAddress: z
		.string()
		.describe('The AVS service manager contract address')
		.openapi({ example: '0x1de75eaab2df55d467494a172652579e6fa4540e' }),
	apy: z.number().describe('The total APY calculated for this AVS').openapi({ example: 0.1 }),
	strategies: z.array(StrategyApySchema)
})

export const StakerRewardsSchema = z.object({
	aggregateApy: z
		.number()
		.describe(
			'The sum of amount staked per strategy multiplied by the strategy apy for this staker'
		)
		.openapi({ example: 0.1 }),
	tokenAmounts: z.array(TokenAmountSchema),
	strategyApys: z.array(StakerStrategyApySchema),
	avsApys: z.array(AvsApysSchema)
})

export const StakerRewardsResponseSchema = StakerResponseSchema.extend({
	rewards: StakerRewardsSchema.describe('The reward details for the Staker')
})
