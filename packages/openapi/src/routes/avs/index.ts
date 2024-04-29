import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getAllAvsAddresses } from './getAllAvsAddresses';
import { getAllAvs } from './getAllAvs';

export const avsRoutes: ZodOpenApiPathsObject = {
    '/avs/addresses': {
        get: getAllAvsAddresses,
    },
    '/avs': { get: getAllAvs },
};
