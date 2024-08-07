import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { TotalWithdrawlsSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';

export const getTotalWithdrawals: ZodOpenApiOperationObject = {
    operationId: 'getTotalWithdrawals',
    summary: 'Retrieve total number of withdrawls ',
    description: 'Returns the total number of withdrawls',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of withdrawls.',
            content: {
                'application/json': {
                    schema: TotalWithdrawlsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
