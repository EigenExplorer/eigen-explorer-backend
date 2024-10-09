import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getAllDeposits } from './getAllDeposits';

export const depositsRoutes: ZodOpenApiPathsObject = {
    '/deposits': { get: getAllDeposits }
};
