import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { OperatorHistoricalCountSchema } from '../../apiResponseSchema/metrics/historicalCountResponse';

const HistoricalOperatorCountResponseSchema = z.object({
    data: z.array(OperatorHistoricalCountSchema)
});

export const getHistoricalOperatorCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalOperatorCount',
    summary: 'Retrieve historical count of AVS operators',
    description: 'Returns the total number of AVS operators registered at timestamp values.',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
    },
    responses: {
        '200': {
            description: 'The total number of AVS operators registered at timestamp values.',
            content: {
                'application/json': {
                    schema: HistoricalOperatorCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};