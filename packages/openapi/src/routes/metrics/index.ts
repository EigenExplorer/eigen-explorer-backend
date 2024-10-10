import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getAllMetrics } from './getAllMetrics'
import { getTvlMetrics } from './getTvl'
import { getBeaconChainTvlMetric } from './getTvlBeaconChain'
import { getRestakingTvlMetrics } from './getTvlRestaking'
import { getTvlRestakingMetricByStrategy } from './getTvlByStrategy'
import { getTotalAvsMetric } from './getTotalAvs'
import { getTotalOperatorsMetric } from './getTotalOperators'
import { getTotalStakerssMetric } from './getTotalStakers'

export const metricsRoutes: ZodOpenApiPathsObject = {
	'/metrics': {
		get: getAllMetrics
	},
	'/metrics/tvl': { get: getTvlMetrics },
	'/metrics/tvl/beacon-chain': { get: getBeaconChainTvlMetric },
	'/metrics/tvl/restaking': { get: getRestakingTvlMetrics },
	'/metrics/tvl/restaking/{strategy}': {
		get: getTvlRestakingMetricByStrategy
	},
	'/metrics/total-avs': { get: getTotalAvsMetric },
	'/metrics/total-operators': { get: getTotalOperatorsMetric },
	'/metrics/total-stakers': { get: getTotalStakerssMetric }
}
