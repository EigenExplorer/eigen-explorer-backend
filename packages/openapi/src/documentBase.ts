import { openApiErrorResponses } from './apiResponseSchema/base/errorResponses'
import { createDocument } from 'zod-openapi'
import { systemRoutes } from './routes/system'
import { avsRoutes } from './routes/avs'
import { metricsRoutes } from './routes/metrics'
import { operatorsRoutes } from './routes/operators'
import { withdrawalsRoutes } from './routes/withdrawals'
import { stakersRoutes } from './routes/stakers'
import { depositsRoutes } from './routes/deposits'
import { historicalRoutes } from './routes/historical'
import { rewardsRoutes } from './routes/rewards'
import { eventRoutes } from './routes/events'

export const document = createDocument({
	openapi: '3.0.3',
	info: {
		title: 'EigenExplorer API',
		description: 'EigenExplorer is a community-driven data platform for EigenLayer AVS.',
		version: '0.0.1',
		license: {
			name: 'MIT',
			url: 'https://spdx.org/licenses/MIT.html'
		}
	},
	servers: [
		{
			url: 'https://api.eigenexplorer.com',
			description: 'EigenExplorer Production API'
		},
		{
			url: 'https://api-holesky.eigenexplorer.com',
			description: 'EigenExplorer Holesky Testnet API'
		}
	],
	paths: {
		...systemRoutes,
		...metricsRoutes,
		...historicalRoutes,
		...avsRoutes,
		...operatorsRoutes,
		...withdrawalsRoutes,
		...stakersRoutes,
		...depositsRoutes,
		...rewardsRoutes,
		...eventRoutes
	},
	components: {
		schemas: {},
		responses: {
			...openApiErrorResponses
		}
	}
})
