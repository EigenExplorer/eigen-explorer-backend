import { openApiErrorResponses } from './apiResponseSchema/base/errorResponses';
import { createDocument } from 'zod-openapi';
import { avsRoutes } from './routes/avs';
import { metricsRoutes } from './routes/metrics';

export const document = createDocument({
    openapi: '3.0.3',
    info: {
        title: 'EigenExplorer API',
        description:
            'EigenExplorer is a community-driven data platform for EigenLayer AVS.',
        version: '0.0.1',
        license: {
            name: 'MIT',
            url: 'https://spdx.org/licenses/MIT.html',
        },
    },
    servers: [
        {
            url: 'https://api.eigenexplorer.com',
            description: 'EigenExplorer Production API',
        },
    ],
    paths: {
        ...metricsRoutes,
        ...avsRoutes,
    },
    components: {
        schemas: {},
        responses: {
            ...openApiErrorResponses,
        },
    },
});
