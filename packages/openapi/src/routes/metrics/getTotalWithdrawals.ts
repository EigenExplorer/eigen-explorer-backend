import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { TotalWithdrawalsSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';

export const getTotalWithdrawals: ZodOpenApiOperationObject = {
    operationId: 'getTotalWithdrawals',
    summary: 'Retrieve total number of withdrawals ',
    description: 'Returns the total number of withdrawals.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of withdrawals.',
            content: {
                'application/json': {
                    schema: TotalWithdrawalsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
