import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getAllOperators } from './getAllOperators';
import { getOperatorByAddress } from './getOperatorByAddress';

export const operatorsRoutes: ZodOpenApiPathsObject = {
    '/operators': { get: getAllOperators },
    '/operators/{address}': { get: getOperatorByAddress }
};
