import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { OperatorHistoricCountSchema } from '../../apiResponseSchema/operator/operatorHistoricCountSchema';

const HistorialOperatorCountResponseSchema = z.object({
    data: z.array(OperatorHistoricCountSchema)
});

export const getHistoricalOperatorCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalOperatorCount',
    summary: 'Retrieve historic count of AVS operators',
    description: 'Returns the total number of AVS operators registered at timestamp values',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
    },
    responses: {
        '200': {
            description: 'The total number of AVS operators registered at timestamp values',
            content: {
                'application/json': {
                    schema: HistorialOperatorCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};