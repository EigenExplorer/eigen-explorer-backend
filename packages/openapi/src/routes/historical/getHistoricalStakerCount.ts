import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { StakerHistoricalCountSchema } from '../../apiResponseSchema/metrics/historicalCountResponse';

const HistoricalStakerCountResponseSchema = z.object({
    data: z.array(StakerHistoricalCountSchema)
});

export const getHistoricalStakerCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalStakerCount',
    summary: 'Retrieve historical count of AVS stakers',
    description: 'Returns the total number of AVS stakers registered at timestamp values.',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
    },
    responses: {
        '200': {
            description: 'The total number of AVS stakers registered at timestamp values.',
            content: {
                'application/json': {
                    schema: HistoricalStakerCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};