import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getHealth } from './getHealth';
import { getVersion } from './getVersion';

export const systemRoutes: ZodOpenApiPathsObject = {
    '/version': { get: getVersion },
    '/health': {
        get: getHealth,
    },
};
