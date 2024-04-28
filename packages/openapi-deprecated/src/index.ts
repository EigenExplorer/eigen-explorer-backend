import { openApiErrorResponses } from './components/responses';
import { createDocument } from 'zod-openapi';
import { avsRoutes } from './routes/avs';
import { AvsAddressSchema } from '../../api/src/schema/zod/schemas/avs';

export const document = createDocument({
    openapi: '3.0.3',
    info: {
        title: 'EigenExplorer API',
        description:
            'EigenExplorer is a community-driven data platform for EigenLayer AVS.',
        version: '0.0.1',
        contact: {
            name: 'EigenExplorer Support',
            email: 'support@dub.co',
            url: 'https://dub.co/api',
        },
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
        ...avsRoutes,
    },
    components: {
        schemas: {
            AvsAddressSchema,
        },
        responses: {
            ...openApiErrorResponses,
        },
    },
});
