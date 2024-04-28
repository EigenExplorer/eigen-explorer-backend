import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getAllAvsAddresses } from './getAllAvsAddresses';

export const avsRoutes: ZodOpenApiPathsObject = {
    '/avs/addresses': {
        get: getAllAvsAddresses,
    },
};
