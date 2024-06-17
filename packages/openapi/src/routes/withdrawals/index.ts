import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getAllWithdrawals } from './getAllWithdrawals';
import { getWithdrawalByWithdrawalRoot } from './getWithdralByWithdrawalRoot';

export const withdrawalsRoutes: ZodOpenApiPathsObject = {
    '/withdrawals': {
        get: getAllWithdrawals,
    },
    '/withdrawals/{withdrawalRoot}': {
        get: getWithdrawalByWithdrawalRoot,
    },
};
