import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { TotalDepositsSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';


export const getTotalDeposits: ZodOpenApiOperationObject = {
    operationId: 'getTotalDeposits',
    summary: 'Retrieve total number of deposits',
    description: 'Returns the total number of deposits.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of deposits.',
            content: {
                'application/json': {
                    schema: TotalDepositsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
