import z from '../../../../api/src/schema/zod'

export const piApyResponseSchema = z.object({
	eigenStrategyApy: z
		.string()
		.describe(
			'APY from EIGEN strategy based on its share of EigenLayer programmatic incentives rewarded in EIGEN token.'
		)
		.openapi({ example: '0.1' }),

	ethAndLstStrategiesApy: z
		.string()
		.describe(
			'APY from ETH and LST strategies based on their share of EigenLayer programmatic incentives rewarded in EIGEN token.'
		)
		.openapi({ example: '0.1' }),

	aggregateApy: z
		.string()
		.optional()
		.describe(
			'Combined APY calculated based on user-supplied token holdings across all strategies.'
		)
		.openapi({ example: '0.1' }),

	totalWeeklyRewardsEigen: z
		.string()
		.optional()
		.describe(
			`Total estimated weekly EIGEN rewards (in wei) based on the user’s supplied token holdings.`
		)
		.openapi({ example: '7388083376288200228' }),

	weeklyRewardsEigen: z.object({
		eigenStrategy: z
			.string()
			.optional()
			.describe(
				'Estimated weekly EIGEN rewards (in wei) for the Eigen strategy, based on user token input.'
			)
			.openapi({ example: '341906218829227306' }),

		ethAndLstStrategies: z
			.string()
			.optional()
			.describe(
				'Estimated weekly EIGEN rewards (in wei) for ETH and LST strategies, based on user token input.'
			)
			.openapi({ example: '7046177157458972922' })
	})
})
