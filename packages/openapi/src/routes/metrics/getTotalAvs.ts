import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { TotalAvsSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';

export const getTotalAvsMetric: ZodOpenApiOperationObject = {
    operationId: 'getTotalAvsMetric',
    summary: 'Retrieve total number of AVS',
    description: 'Returns the total number of AVS registered.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of AVS registered.',
            content: {
                'application/json': {
                    schema: TotalAvsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
