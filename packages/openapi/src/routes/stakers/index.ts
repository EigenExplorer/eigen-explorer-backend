import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getStakerWithdrawals } from './getStakerWithdrawals';
import { getQueuedStakerWithdrawals } from './getQueuedStakerWithdrawals';
import { getQueuedWithdrawableStakerWithdrawals } from './getQueuedWithdrawableStakerWithdrawals';
import { getCompletedStakerWithdrawals } from './getCompletedStakerWithdrawals';

export const stakersRoutes: ZodOpenApiPathsObject = {
    '/stakers/{address}/withdrawals': {
        get: getStakerWithdrawals,
    },
    '/stakers/{address}/withdrawals/queued': {
        get: getQueuedStakerWithdrawals,
    },
    '/stakers/{address}/withdrawals/queued_withdrawable': {
        get: getQueuedWithdrawableStakerWithdrawals,
    },
    '/stakers/{address}/withdrawals/completed': {
        get: getCompletedStakerWithdrawals,
    },
};
