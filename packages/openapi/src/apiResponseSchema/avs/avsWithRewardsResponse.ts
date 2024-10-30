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
						apy: 0.00016956497239057833
					},
					{
						strategyAddress: '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
						apy: 0.001007600130048518
					}
				],
				aggregateApy: 1.060577413975275
			}
		})
})
