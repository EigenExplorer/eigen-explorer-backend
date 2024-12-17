import { RewardsSchema } from '../base/rewardsResponse'
import { AvsSchema } from './avsResponse'

export const AvsWithRewardsSchema = AvsSchema.extend({
	rewards: RewardsSchema.optional()
		.describe('The rewards and APY information of the AVS strategies')
		.openapi({
			example: {
				strategies: [
					{
						strategyAddress: '0xbeac0eeeeeeeeeeeeeeeeeeeeeeeeeeeeeebeac0',
						apy: 0.1
					},
					{
						strategyAddress: '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
						apy: 0.1
					}
				],
				aggregateApy: 1.0
			}
		})
})
