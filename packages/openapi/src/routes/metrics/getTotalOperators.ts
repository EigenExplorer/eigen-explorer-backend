import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';

const TotalOperatorsSchema = z.object({
    totalOperators: z
        .number()
        .describe('The total number of AVS operators registered')
        .openapi({ example: 1000000 }),
});

export const getTotalOperatorsMetric: ZodOpenApiOperationObject = {
    operationId: 'getTotalOperatorsMetric',
    summary: 'Retrieve total number of AVS operators',
    description: 'Returns the total number of AVS operators registered.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of AVS operators registered.',
            content: {
                'application/json': {
                    schema: TotalOperatorsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
